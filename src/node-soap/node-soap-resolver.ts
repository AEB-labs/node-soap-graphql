import {
    SoapAttribute,
    SoapComplexType,
    SoapField,
    SoapSimpleType,
    SoapType,
} from '../soap2graphql/soap-endpoint';
import {inspect} from 'util';
import {NodeSoapOperation} from './node-soap-endpoint';
import {NodeSoapWsdl} from './node-soap';
import {LateResolvedMessage, Logger} from '../soap2graphql/logger';
import {
    ComplexContentElement,
    ComplexTypeElement,
    Element,
    ElementElement,
    ExtensionElement,
    InputElement,
    RestrictionElement,
    SequenceElement,
    SimpleTypeElement,
} from 'soap/lib/wsdl/elements';
import {isListType} from 'graphql/type';

type XsdSupportedTypeDefinition = ComplexTypeElement | SimpleTypeElement | ElementElement;

const XS_STRING: SoapType = {
    kind: 'simpleType',
    name: 'string',
    namespace: 'http://www.w3.org/2001/XMLSchema',
    base: null
};

export class NodeSoapWsdlResolver {
    private alreadyResolved: Map<string, SoapType> = new Map();

    constructor(private wsdl: NodeSoapWsdl, private logger: Logger) {}

    warn(message: LateResolvedMessage): void {
        this.logger.warn(message);
    }

    debug(message: LateResolvedMessage): void {
        this.logger.debug(message);
    }

    createOperationArgs(operation: NodeSoapOperation): SoapType {
        const inputContent: InputElement = operation.operationElement()['input'];

        this.debug(
            () =>
                `creating args for operation '${operation.name()}' from content '${inspect(
                    inputContent,
                    false,
                    5,
                )}'`,
        );

        if (!inputContent) {
            this.warn(() => `no input definition for operation '${operation.name()}'`);
            return undefined
        }

        if (!inputContent.$type && !inputContent.$lookupType) {
            // no args
            return undefined;
        }

        const ns = this.resolveNamespace(inputContent);
        const inputType = this.resolveWsdlNameToSoapType(
            ns,
            withoutNamespace(inputContent.$type || inputContent.$lookupType),
            `args of operation '${operation.name()}'`,
        );
        return inputType;
    }

    createOperationOutput(operation: NodeSoapOperation): { type: SoapType; isList: boolean } {
        const outputContent: ElementElement = operation.operationElement()['output'];

        this.debug(
            () =>
                `creating output for operation '${operation.name()}' from content '${inspect(
                    outputContent,
                    false,
                    5,
                )}'`,
        );
        if (!outputContent) {
            this.debug(() => `no output definition for operation '${operation.name()}'`);
            return undefined;
        }
        if (!outputContent.$type && !outputContent.$lookupType) {
            // no fields
            return undefined;
        }
        const ns = this.resolveNamespace(outputContent);
        const outputType = this.resolveWsdlNameToSoapType(
            ns,
            withoutNamespace(outputContent.$type || outputContent.$lookupType),
            `return type of operation '${operation.name()}`,
        );
        return {
            type: outputType,
            isList: isListType(outputContent),
        };
    }

    resolveWsdlNameToSoapType(
        namespace: string,
        wsdlTypeName: string,
        ownerStringForLog: string,
    ): SoapType {
        this.debug(
            () =>
                `resolving soap type for ${ownerStringForLog} from namespace '${namespace}', type name '${wsdlTypeName}'`,
        );

        // lookup cache; this accomplishes three things:
        // 1) an incredible boost in performance, must be at least 3ns, !!hax0r!!11
        // 2) every type definition (primitive and complex) has only one instance of SoapType
        // 3) resolve circular dependencies between types
        const resolvedSoapType = this.alreadyResolved.get(`${namespace}:${wsdlTypeName}`);
        if (resolvedSoapType) {
            this.debug(
                () =>
                    `resolved soap type for namespace: '${namespace}', typeName: '${wsdlTypeName}' from cache`,
            );
            return resolvedSoapType;
        }

        // get the defition of the type from the schema section in the WSDL
        const schemaObject = this.wsdl.findSchemaObject(namespace, wsdlTypeName);

        if (!schemaObject) {
            // has no type definition
            // This happens in case of bad wsdl/xsd or in case of XMLSchema defined simple types
            const soapType: SoapSimpleType = {
                kind: 'simpleType',
                name: wsdlTypeName,
                namespace: namespace,
                base: null
            };
            this.alreadyResolved.set(`${namespace}:${wsdlTypeName}`, soapType);

            this.debug(
                () =>
                    `resolved namespace: '${namespace}', typeName: '${wsdlTypeName}' to simple type '${soapType}'`,
            );
            return soapType;
        }

        let soapType: SoapType;
        switch (schemaObject.constructor) {
            case ComplexTypeElement:
                soapType = {
                    kind: 'complexType',
                    name: schemaObject.$name,
                    namespace: namespace,
                    base: null,
                    fields: [],
                    attributes: null,
                };
                break;
            case SimpleTypeElement:
                soapType = {
                    kind: 'simpleType',
                    name: schemaObject.$name,
                    namespace: namespace,
                    base: null,
                };
                break;
            case ElementElement:
                if (schemaObject.$type) {
                    const ns = this.resolveNamespace(schemaObject);
                    const type = this.findXsdTypeDefinition(ns, schemaObject.$type);
                    const soapType = this.resolveWsdlNameToSoapType(
                        ns,
                        withoutNamespace(schemaObject.$lookupType),
                        `return type of element '${schemaObject.$name}`,
                    );
                    this.alreadyResolved.set(`${soapType.namespace}:${soapType.name}`, soapType);
                    return soapType;
                } else {
                    // must be anonymous
                    const soapType = this.resolveAnonymousTypeToSoapType(
                        schemaObject,
                        schemaObject.$name,
                    );
                    this.alreadyResolved.set(`${soapType.namespace}:${soapType.name}`, soapType);
                    return soapType;
                }
            default:
                soapType = XS_STRING;
                this.warn(
                    () =>
                        `unsupported element '${schemaObject.name}' as operation message part. Using string.`,
                );
        }

        this.alreadyResolved.set(`${namespace}:${wsdlTypeName}`, soapType);

        // resolve bindings (field types, base type) after type has been registered to resolve circular dependencies
        if (!(soapType instanceof ElementElement)) {
            try {
                this.resolveTypeBody(soapType, namespace, schemaObject);
            } catch (e) {
                if (soapType.kind === 'complexType') {
                    soapType.fields = undefined;
                } else {
                    this.alreadyResolved.set(`${namespace}:${wsdlTypeName}`, XS_STRING);
                    soapType = XS_STRING;
                }
            }
        }

        this.debug(
            () =>
                `resolved namespace: '${namespace}', typeName: '${wsdlTypeName}' to object type '${inspect(
                    soapType,
                    false,
                    3,
                )}'`,
        );
        return soapType;
    }

    private resolveAnonymousTypeToSoapType(
        xsdFieldDefinition: ElementElement,
        generatedTypeName: string,
    ): SoapType {
        const namespace = this.resolveNamespace(xsdFieldDefinition);
        let existingDef = this.findXsdTypeDefinition(namespace, generatedTypeName);
        while (!!existingDef && !(existingDef instanceof ElementElement)) {
            generatedTypeName = generatedTypeName + '_';
            existingDef = this.findXsdTypeDefinition(namespace, generatedTypeName);
        }
        const ownerStringForLog = `field '${xsdFieldDefinition.$name}' of soap type '${generatedTypeName}'`;
        this.debug(
            () => `resolving anonymous type for ${ownerStringForLog} from namespace '${namespace}'`,
        );
        // TODO: fix for simple types
        const soapType: SoapComplexType = {
            kind: 'complexType',
            name: generatedTypeName,
            namespace: xsdFieldDefinition.$targetNamespace,
            base: null,
            fields: null,
            attributes: null,
        };

        // resolve bindings (field types, base type)
        const bodyTypeDefinition = xsdFieldDefinition.children
            ? xsdFieldDefinition.children[0]
            : undefined;
        if (bodyTypeDefinition) {
            this.resolveTypeBody(
                soapType,
                namespace,
                bodyTypeDefinition as XsdSupportedTypeDefinition,
            );
            this.debug(
                () =>
                    `resolved namespace: '${namespace}', typeName: '${generatedTypeName}' to object type '${inspect(
                        soapType,
                        false,
                        3,
                    )}'`,
            );
        } else {
            this.warn(
                () =>
                    `cannot determine type definition for soap type '${generatedTypeName}', leaving fields empty`,
            );
        }
        return soapType;
    }

    private findXsdTypeDefinition(namespace: string, typeName: string): XsdSupportedTypeDefinition {
        return this.wsdl.findSchemaObject(namespace, typeName);
    }

    private resolveTypeBody(
        soapType: SoapType,
        namespace: string,
        typeDefinition: ComplexTypeElement | SimpleTypeElement,
    ): void {
        this.debug(
            () =>
                `resolving body of soap type '${
                    soapType.name
                }' from namespace '${namespace}', definition '${inspect(
                    typeDefinition,
                    false,
                    9,
                )}'`,
        );

        const typeName: string = typeDefinition.$name;

        let fields: Element[];
        let base: SoapType|null;

        const body: Element = typeDefinition.children[0];
        const attributes: Element[] = typeDefinition.children.filter(
            (t) => t.nsName == 'xs:attribute',
        );
        switch (body?.constructor) {
            case SequenceElement:
                fields = this.extractChildren(body as SequenceElement);
                break;
            case ComplexContentElement:
                const extensionOrRestriction = body.children.find(
                    (child) =>
                        child instanceof ExtensionElement || child instanceof RestrictionElement,
                ) as ExtensionElement | RestrictionElement;
                base = this.resolveBaseType(extensionOrRestriction, soapType.name)
                const sequence: SequenceElement = extensionOrRestriction.children.find(
                    (child) => child instanceof SequenceElement,
                ) as SequenceElement;
                if (!sequence) {
                    this.warn(
                        () =>
                            `cannot parse fields for soap type '${typeName}' as currently only restrictions/extensions with sequence are supported. leaving fields empty`,
                    );
                    fields = []
                } else {
                    fields = this.extractChildren(sequence);
                }
                break;
            case SimpleTypeElement:
                const restriction = body.children.find(
                    (child) => child instanceof RestrictionElement,
                ) as RestrictionElement;
                base = this.resolveBaseType(restriction, soapType.name)
                break;
            default:
                this.warn(() => `cannot parse fields for soap type '${typeName}'`);
                fields = []
                base = null;
        }
        switch (soapType.kind) {
            case 'complexType':
                if (!base && !fields.length) {
                    this.warn(() => `returning complex type ${typeName} without fields`);
                }
                if (base) {
                    if (base.kind !== 'complexType') {
                        throw new Error(`Expected complex type as base of complex type ${soapType.name}`)
                    }
                    soapType.base = base;
                }
                soapType.fields = this.resolveSoapFields(fields, soapType);
                soapType.attributes = this.resolveSoapAttributes(attributes, soapType);
                return;
            case 'simpleType':
                if (base) {
                    if (base.kind !== 'simpleType') {
                        throw new Error(`Expected simple type as base of simple type ${soapType.name}`)
                    }
                    soapType.base = base;
                }
        }
    }

    private resolveBaseType(element: RestrictionElement, soapTypeName: string): SoapType | null {
        const baseTypeName = withoutNamespace(element.$base);
        const baseTypeNamespace = this.resolveNamespace(element, namespacePrefix(element.$base))
        if (!baseTypeName) {
            return null;
        }
        return this.resolveWsdlNameToSoapType(
            baseTypeNamespace,
            baseTypeName,
            `base type of soap type '${soapTypeName}'`,
        )
    }

    private resolveSoapFields(fieldElements: Element[], soapType: SoapComplexType): SoapField[] {
        const fields = fieldElements.map((field: ElementElement) => {
            let type;
            if (field.$type) {
                const ns = this.resolveNamespace(field);
                type = this.resolveWsdlNameToSoapType(
                    ns,
                    withoutNamespace(field.$type),
                    `field '${field.$name}' of soap type '${soapType.name}'`,
                );
            } else if (field.$ref) {
                const ns = this.resolveNamespace(field, namespacePrefix(field.$ref));
                type = this.resolveWsdlNameToSoapType(
                    ns,
                    withoutNamespace(field.$ref),
                    `field '${field.$name}' of soap type '${soapType.name}'`,
                );
                return {
                    name: withoutNamespace(field.$ref),
                    type,
                    isList: getIsList(field)
                }
            } else if (field.children.length) {
                let generatedTypeName = `${soapType.name}_${capitalizeFirstLetter(field.$name)}`;
                type = this.resolveAnonymousTypeToSoapType(field, generatedTypeName);
            } else {
                this.warn(
                    () =>
                        `Impossible to generate type for field without type and without children, using string for '${field.$name}'.`,
                );
                type = XS_STRING;
            }
            return {
                name: field.$name,
                type,
                isList: getIsList(field),
            };
        });
        return fields;
    }

    private resolveSoapAttributes(
        attributeElements: Element[],
        soapType: SoapComplexType,
    ): SoapAttribute[] {
        const attributes = attributeElements.map((attribute: ElementElement) => {
            let type;
            if (attribute.$type) {
                const ns = this.resolveNamespace(attribute);
                type = this.resolveWsdlNameToSoapType(
                    ns,
                    withoutNamespace(attribute.$type),
                    `field '${attribute.$name}' of soap type '${soapType.name}'`,
                );
            } else {
                this.warn(
                    () =>
                        `Impossible to generate type for attribute without type and without children, using string for '${attribute.$name}'.`,
                );
                type = XS_STRING;
            }
            return {
                name: attribute.$name,
                type,
                isList: false,
            };
        });
        return attributes;
    }

    private extractChildren(sequence: SequenceElement): Element[] {
        const result: Element[] = [];
        sequence.children.forEach((child) => {
            switch (child.constructor) {
                case ElementElement:
                    result.push(child);
                    break;
                default:
                    this.warn(
                        () => `${child.name} is currently not supported in field '${child.$name}'.`,
                    );
                    throw new Error('Unsupported definition');
            }
        });
        return result;
    }

    resolveNamespace(contextElement: ElementElement, prefix?: string) {
        if (!prefix) {
            prefix = namespacePrefix(contextElement.$type || contextElement.$lookupType);
        }
        return contextElement.xmlns[prefix] || contextElement.schemaXmlns[prefix] || this.wsdl.definitions.xmlns[prefix] || contextElement.$targetNamespace;
    }

}

export function withoutNamespace(value: string): string {
    if (!value) {
        return value;
    }
    const matcher: RegExpMatchArray = value.match(/[a-zA-Z0-9]+:(.+)/);
    return !matcher || matcher.length < 2 ? value : matcher[1];
}

function namespacePrefix(value: string): string {
    if (!value) {
        return value;
    }
    const matcher: RegExpMatchArray = value.match(/([a-zA-Z0-9]+):.+/);
    return !matcher || matcher.length < 2 ? value : matcher[1];
}

function capitalizeFirstLetter(value: string) {
    return value.charAt(0).toUpperCase() + value.substring(1);
}

function getIsList(field: { $maxOccurs?: string }): boolean {
    return !!field.$maxOccurs && field.$maxOccurs === 'unbounded';
}
