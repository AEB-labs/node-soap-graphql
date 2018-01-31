import { SoapEndpoint, SoapType, SoapObjectType, SoapField, SoapService, SoapPort, SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapClient } from './node-soap';
import { inspect } from 'util';

export function createSoapEndpoint(soapClient: SoapClient, debug: boolean = false): SoapEndpoint {
    return new NodeSoapEndpointImpl(soapClient, debug);
}

export class NodeSoapEndpointImpl implements SoapEndpoint {

    constructor(protected soapClient: any, public debug: boolean) {
    }

    description(): string {
        return this.describe();
    }

    services(): NodeSoapService[] {
        const services: NodeSoapService[] = [];
        const content: any = this.describe();
        for (let key in content) {
            services.push(new NodeSoapService(this, key, content[key]));
        }
        return services;
    }

    private _describe: any = null;
    protected describe(): any {
        if (!this._describe) {
            this._describe = this.soapClient.describe();
        }
        return this._describe;
    }

    findTypeName(content: any): string {
        const types = this.soapClient.wsdl.definitions.descriptions.types;
        for (let key in types) {
            if (types[key] === content) {
                return key;
            }
        }
        return null;
    }

    private alreadyResolved: Map<string, SoapType> = new Map();

    resolveType(namespace: string, typeName: string): SoapType {

        if (!!this.debug) {
            console.log(`resolving soap type, namespace: '${namespace}', typeName: '${typeName}'`);
        }

        if (!typeName) {
            return null;
        }

        if (this.alreadyResolved.has(namespace + typeName)) {
            if (!!this.debug) {
                console.log(`resolved namespace: '${namespace}', typeName: '${typeName}' from cache`);
            }
            return this.alreadyResolved.get(namespace + typeName);
        }

        const definition: any = this.findTypeDefinition(namespace, typeName);
        if (!definition) {
            // primitive type, e.g. 'string'
            const wsdlType: string = withoutNamespace(typeName);
            this.alreadyResolved.set(namespace + typeName, wsdlType);

            if (!!this.debug) {
                console.log(`resolved namespace: '${namespace}', typeName: '${typeName}' to primitive '${inspect(wsdlType, false, 3)}'`);
            }

            return wsdlType;
        } else {
            const wsdlType: SoapObjectType = this.createType(namespace, definition);
            this.alreadyResolved.set(namespace + typeName, wsdlType);
            // resolve bindings (field types, base type) after type has been registered to resolve circular dependencies
            // @todo should solve this with Promise
            this.resolveBindings(wsdlType, namespace, definition);

            if (!!this.debug) {
                console.log(`resolved namespace: '${namespace}', typeName: '${typeName}' to object type '${inspect(wsdlType, false, 3)}'`);
            }

            return wsdlType;
        }

    }

    findTypeDefinition(namespace: string, typeName: string): any {
        return this.soapClient.wsdl.findSchemaObject(namespace, typeName)
    }

    createType(namespace: string, definition: any): SoapObjectType {

        const typeName = definition['$name'];

        return {
            name: typeName,
            base: null,
            fields: null,
        };
    }

    resolveBindings(wsdlType: SoapObjectType, namespace: string, definition: any): void {

        const typeName = definition['$name'];

        let fields: any[] = null;
        let baseTypeName = null;
        const def = definition.children[0];
        if (def.name === 'sequence') {
            fields = def.children || [];
        } else if (def.name === 'complexContent') {
            fields = def.children[0].children[0].children || [];
            baseTypeName = withoutNamespace(def.children[0]['$base']);
        } else {
            console.warn(`cannot parse fields for type ${typeName}`, definition);
            fields = [];
        }

        const wsdlFields: SoapField[] = fields.map((field: any) => {
            return {
                name: field['$name'],
                type: this.resolveType(field['$targetNamespace'], withoutNamespace(field['$type'])),
                isList: !!field['$maxOccurs'] && field['$maxOccurs'] === 'unbounded',
            }
        });

        wsdlType.fields = wsdlFields;
        wsdlType.base = !baseTypeName ? null : <SoapObjectType>this.resolveType(namespace, baseTypeName);
    }

}

export class NodeSoapService implements SoapService {

    constructor(private _wsdl: NodeSoapEndpointImpl, private _name: string, private _content: any) {
    }

    endpoint(): NodeSoapEndpointImpl {
        return this._wsdl;
    }

    name(): string {
        return this._name;
    }

    ports(): NodeSoapPort[] {
        const ports: NodeSoapPort[] = [];
        for (let key in this._content) {
            ports.push(new NodeSoapPort(this, key, this._content[key]));
        }
        return ports;
    }

}

export class NodeSoapPort implements SoapPort {

    constructor(private _service: NodeSoapService, private _name: string, private _content: any) {
    }

    endpoint(): NodeSoapEndpointImpl {
        return this.service().endpoint();
    }

    service(): NodeSoapService {
        return this._service;
    }

    name(): string {
        return this._name;
    }

    operations(): NodeSoapOperation[] {
        const operations: NodeSoapOperation[] = [];
        for (let key in this._content) {
            operations.push(new NodeSoapOperation(this, key, this._content[key]));
        }
        return operations;
    }

}

export class NodeSoapOperation implements SoapOperation {

    constructor(private _port: NodeSoapPort, private _name: string, private _content: any) {
    }

    endpoint(): NodeSoapEndpointImpl {
        return this.port().endpoint();
    }

    service(): NodeSoapService {
        return this.port().service();
    }

    port(): NodeSoapPort {
        return this._port;
    }

    name(): string {
        return this._name;
    }

    private _inputs: SoapField[] = null;
    inputs(): SoapField[] {
        if (!this._inputs) {
            this._inputs = this.createFields();
        }
        return this._inputs;
    }

    private createFields(): SoapField[] {

        const inputContent: any = this._content['input'];

        if (!!this.endpoint().debug) {
            console.log(`creating fields for operation '${this.name()}' from input content '${inspect(inputContent, false, 5)}'`);
        }

        const wsdlFields: SoapField[] = nonNamespaceKeys(inputContent).map((key: string) => {
            const parsedFieldName = parseFieldName(key);

            const wsdlField: SoapField = {
                name: parsedFieldName.name,
                type: this.parseFieldType(inputContent, key),
                isList: parsedFieldName.isList,
            };
            return wsdlField;
        })

        return wsdlFields;
    }

    private parseFieldType(inputContent: any, key: string): SoapType {
        const fieldContent = inputContent[key];
        const complexType = this.endpoint().findTypeName(fieldContent);
        return this.endpoint().resolveType(targetNamespace(fieldContent), complexType || fieldContent)
    }

    private _output: { type: { type: SoapType, isList: boolean }; resultField: string } = null;
    output(): { type: SoapType, isList: boolean } {
        if (!this._output) {
            this._output = this.createOutput();
        }
        return this._output.type;
    }
    resultField(): string {
        if (!this._output) {
            this._output = this.createOutput();
        }
        return this._output.resultField;
    }

    private createOutput(): { type: { type: SoapType, isList: boolean }; resultField: string } {
        const outputContent: any = this._content['output'];

        if (!!this.endpoint().debug) {
            console.log(`creating output type for operation '${this.name()}' from output content '${inspect(outputContent, false, 5)}'`);
        }

        // find the name of the result content
        const outputKeys: string[] = nonNamespaceKeys(outputContent);
        if (outputKeys.length > 0) {
            if (outputKeys.length > 1) {
                console.warn('multiple fields in output of operation ', this.name());
            }
            const resultFieldName = outputKeys[0];

            const resultContent = outputContent[resultFieldName];
            const resultTypeName: string =
                typeof resultContent === 'string'
                    ? resultContent // primitive
                    : this.endpoint().findTypeName(resultContent);

            return {
                type: {
                    type: this.endpoint().resolveType(targetNamespace(resultContent), resultTypeName),
                    isList: parseFieldName(resultFieldName).isList
                },
                resultField: resultFieldName
            };
        } else {
            // void operation; use String as result type. when executed, it will return null
            return {
                type: {
                    type: 'string',
                    isList: false
                },
                resultField: null
            };
        }
    }

}

function nonNamespaceKeys(obj: any): string[] {
    return Object.keys(obj).filter(key => !isNamespaceKey(key));
}

function targetNamespace(content: any) {
    return content['targetNamespace'];
}

function isNamespaceKey(key: string): boolean {
    return key === 'targetNSAlias' || key === 'targetNamespace';
}

function withoutNamespace(value: string): string {
    if (!value) {
        return value;
    }
    const matcher: RegExpMatchArray = value.match(/[a-zA-Z0-9]+\:(.+)/);
    return !matcher || matcher.length < 2 ? value : matcher[1];
}

function parseFieldName(fieldName: string): { name: string, isList: boolean } {
    if (fieldName.endsWith('[]')) {
        return {
            name: fieldName.substring(0, fieldName.length - 2),
            isList: true,
        }
    } else {
        return {
            name: fieldName,
            isList: false,
        }
    }
}
