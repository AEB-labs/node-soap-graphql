import { SoapType, SoapOperationArg, SoapObjectType, SoapField } from "../soap2graphql/soap-endpoint";
import { inspect } from "util";
import { NodeSoapOperation, NodeSoapEndpoint } from "./node-soap-endpoint";
import { NodeSoapClient } from "./node-soap";

// an content object ... basically a plain JS object
type WsdlContent = { [key: string]: any };
// a type definition in the WSDL;
// Content: a complete definition of the type (fields etc.)
// string: a primitive type (e.g. "xs:string")
// null: ...probably a faulty WSDL
type WsdlTypeContent = WsdlContent | string | null;

// input content of an operation, defines the args of the operation
type WsdlInputContent = { [argName: string]: WsdlArgContent } | {} | null;
type WsdlArgContent = WsdlTypeContent;

// output content of an operation, defines the result type
type WsdlOutputContent = { resultFieldName: WsdlResultContent } | {} | null;
type WsdlResultContent = WsdlTypeContent;


type XsdTypeDefinition = { name: 'complexType', $name: string; children: XsdTypeDefinitionBody[] };

type XsdTypeDefinitionBody = XsdSequence | XsdComplexType;

type XsdSequence = { name: 'sequence', children: XsdFieldDefinition[] };

type XsdComplexType = { name: 'complexContent', children: XsdExtension[] };
type XsdExtension = { name: 'extension'; $base: string; children: XsdSequence[] };

type XsdFieldDefinition = {
    $name: string;
    $targetNamespace: string;
    $type: string;
    $maxOccurs?: 'unbounded' | string;
};

export class NodeSoapResolver {

    private alreadyResolved: Map<string, SoapType> = new Map();

    constructor(private endpoint: NodeSoapEndpoint, private debug: boolean) {
    }

    get soapClient(): NodeSoapClient {
        return this.endpoint.soapClient;
    }

    createOperationArgs(operation: NodeSoapOperation): SoapOperationArg[] {

        const inputContent: WsdlInputContent = operation.content()['input'];

        if (!!this.debug) {
            console.log(`creating args for operation '${operation.name()}' from input content '${inspect(inputContent, false, 5)}'`);
        }
        if (!inputContent) {
            console.log(`no input definition for operation ${operation.name()}`);
        }

        // inputContent===null -> argNames===[]
        const argNames: string[] = nonNamespaceKeys(inputContent);

        const args: SoapOperationArg[] = argNames.map((key: string) => {
            return this.createOperationArg(operation, key, inputContent[key]);
        }).filter(arg => !!arg);

        return args;
    }

    private createOperationArg(operation: NodeSoapOperation, argWsdlFieldName: string, argContent: WsdlArgContent): SoapOperationArg {

        const parsedArgName: { name: string, isList: boolean } = parseWsdlFieldName(argWsdlFieldName);

        const inputType: SoapType = this.resolveContentToSoapType(argContent, `arg ${argWsdlFieldName} of operation ${operation.name()}`);

        const input: SoapOperationArg = {
            name: parsedArgName.name,
            type: inputType,
            isList: parsedArgName.isList,
        };
        return input;
    }

    createOperationOutput(operation: NodeSoapOperation): { type: { type: SoapType, isList: boolean }; resultField: string } {

        function emptyOutput() {
            return {
                type: { type: 'string', isList: false }, resultField: null
            };
        }

        const outputContent: WsdlOutputContent = operation.content()['output'];

        if (!!this.debug) {
            console.log(`creating output for operation '${operation.name()}' from output content '${inspect(outputContent, false, 5)}'`);
        }

        // determine type and field name
        let resultType: SoapType;
        let resultFieldName: string;
        const ownerStringForLog: string = `output of operation ${operation.name()}`;
        if (!outputContent) {
            console.log(`no output definition for operation ${operation.name()}, using 'string'`);
            resultType = this.resolveContentToSoapType('string', ownerStringForLog);

        } else {
            const outputContentKeys: string[] = nonNamespaceKeys(outputContent);

            if (outputContentKeys.length <= 0) {
                // content has no sub content
                // void operation; use String as result type. when executed, it will return null
                resultFieldName = null;
                resultType = this.resolveContentToSoapType('string', ownerStringForLog);

            } else {

                if (outputContentKeys.length > 1) {
                    // content has multiple fields, use the first one
                    // @todo maybe better build an extra type for this case, but how to name it?
                    console.log(`multiple result fields in output definition operation ${operation.name()}, using first one`);
                }

                resultFieldName = outputContentKeys[0];
                const resultContent: WsdlResultContent = outputContent[resultFieldName];

                if (!resultContent) {
                    console.log(`no type definition for result field '${resultFieldName}' in output definition for operation ${operation.name()}, using 'string'`);
                    resultType = this.resolveContentToSoapType('string', ownerStringForLog);

                } else {
                    resultType = this.resolveContentToSoapType(resultContent, ownerStringForLog);
                }
            }
        }

        const parsedResultFieldName = parseWsdlFieldName(resultFieldName);

        return {
            type: {
                type: resultType,
                isList: parsedResultFieldName.isList
            },
            resultField: parsedResultFieldName.name
        };

    }

    private resolveContentToSoapType(typeContent: WsdlTypeContent, ownerStringForLog: string): SoapType {

        if (!!this.debug) {
            console.log(`resolving soap type for ${ownerStringForLog} from content '${inspect(typeContent, false, 3)}'`);
        }

        // determine name of the type
        let wsdlTypeName;
        if (!typeContent) {
            console.log(`no type definition for ${ownerStringForLog}, using 'string'`);
            wsdlTypeName = 'string';

        } else if (typeof typeContent === 'string') {
            // primitive type
            wsdlTypeName = typeContent;

        } else {
            wsdlTypeName = this.findTypeName(typeContent);
            if (!wsdlTypeName) {
                console.log(`no type name found for ${ownerStringForLog}, using 'string'`);
                wsdlTypeName = 'string';
            }
        }

        const wsdlNamespace: string = targetNamespace(typeContent);

        return this.resolveWsdlNameToSoapType(wsdlNamespace, wsdlTypeName, ownerStringForLog);
    }

    private findTypeName(content: WsdlTypeContent): string {
        const types = this.soapClient.wsdl.definitions.descriptions.types;
        for (let key in types) {
            if (types[key] === content) {
                return key;
            }
        }
        return null;
    }

    resolveWsdlNameToSoapType(namespace: string, wsdlTypeName: string, ownerStringForLog: string): SoapType {

        if (!!this.debug) {
            console.log(`resolving soap type for namespace '${wsdlTypeName}', type name '${wsdlTypeName}' of ${ownerStringForLog}`);
        }

        // lookup cache; this accomplishes three things:
        // 1) an incredible boost in performance, must be at least 3ns, !!hax0r!!11
        // 2) every type definition (primitive and complex) has only one instance of SoapType
        // 3) resolve circular dependencies between types
        if (this.alreadyResolved.has(namespace + wsdlTypeName)) {
            if (!!this.debug) {
                console.log(`resolved soap type for namespace: '${namespace}', typeName: '${wsdlTypeName}' from cache`);
            }
            return this.alreadyResolved.get(namespace + wsdlTypeName);
        }

        // get the defition of the type from the schema section in the WSDL
        const typeDefinition: XsdTypeDefinition = this.findXsdTypeDefinition(namespace, wsdlTypeName);

        if (!typeDefinition) {
            // has no type definition
            // --> primitive type, e.g. 'string'
            const soapType: string = withoutNamespace(wsdlTypeName);
            this.alreadyResolved.set(namespace + wsdlTypeName, soapType);

            if (!!this.debug) {
                console.log(`resolved namespace: '${namespace}', typeName: '${wsdlTypeName}' to primitive '${inspect(soapType, false, 3)}'`);
            }

            return soapType;
        } else {
            const soapType: SoapObjectType = this.createTypeHead(namespace, typeDefinition);
            this.alreadyResolved.set(namespace + wsdlTypeName, soapType);
            // resolve bindings (field types, base type) after type has been registered to resolve circular dependencies
            this.resolveTypeBody(soapType, namespace, typeDefinition);

            if (!!this.debug) {
                console.log(`resolved namespace: '${namespace}', typeName: '${wsdlTypeName}' to object type '${inspect(soapType, false, 3)}'`);
            }

            return soapType;
        }
    }

    private findXsdTypeDefinition(namespace: string, typeName: string): XsdTypeDefinition {
        return this.soapClient.wsdl.findSchemaObject(namespace, typeName)
    }

    private createTypeHead(namespace: string, definition: XsdTypeDefinition): SoapObjectType {

        const typeName = definition.$name;

        return {
            name: withoutNamespace(typeName),
            base: null,
            fields: null,
        };
    }

    private resolveTypeBody(soapType: SoapObjectType, namespace: string, typeDefinition: XsdTypeDefinition): void {

        const typeName: string = typeDefinition.$name;

        let fields: XsdFieldDefinition[] = null;
        let baseTypeName: string = null;

        const body: XsdTypeDefinitionBody = typeDefinition.children[0];

        if (body.name === 'sequence') {
            const sequence: XsdSequence = body;
            fields = sequence.children || [];
        } else if (body.name === 'complexContent') {
            const extension: XsdExtension = body.children[0];
            const sequence: XsdSequence = extension.children[0];
            baseTypeName = withoutNamespace(extension.$base);
            fields = sequence.children || [];
        } else {
            console.log(`cannot parse fields for type ${typeName}`, typeDefinition);
            fields = [];
        }

        const soapFields: SoapField[] = fields.map((field: XsdFieldDefinition) => {
            return {
                name: field.$name,
                type: this.resolveWsdlNameToSoapType(field.$targetNamespace, withoutNamespace(field.$type), ''),
                isList: !!field.$maxOccurs && field.$maxOccurs === 'unbounded',
            }
        });

        // @todo in XSD it is possible to inherit a type from a primitive ... may have to handle this
        const baseType: SoapObjectType = !baseTypeName ? null : <SoapObjectType>this.resolveWsdlNameToSoapType(namespace, baseTypeName, '');

        soapType.fields = soapFields;
        soapType.base = baseType;
    }

}

function nonNamespaceKeys(obj: any): string[] {
    return !obj ? [] : Object.keys(obj).filter(key => !isNamespaceKey(key));
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

function isWsdlListFieldName(wsdlFieldName: string): boolean {
    return !!wsdlFieldName && wsdlFieldName.endsWith('[]');
}

function parseWsdlFieldName(wsdlFieldName: string): { name: string, isList: boolean } {
    if (isWsdlListFieldName(wsdlFieldName)) {
        return {
            name: wsdlFieldName.substring(0, wsdlFieldName.length - 2),
            isList: true,
        }
    } else {
        return {
            name: wsdlFieldName,
            isList: false,
        }
    }
}