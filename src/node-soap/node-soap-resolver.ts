import {
    SoapComplexType,
    SoapField,
    SoapSimpleType,
    SoapType,
} from '../soap2graphql/soap-endpoint';
import { inspect } from 'util';
import { NodeSoapOperation } from './node-soap-endpoint';
import { NodeSoapWsdl } from './node-soap';
import { LateResolvedMessage, Logger } from '../soap2graphql/logger';
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
import { isListType } from 'graphql/type';

type XsdSupportedTypeDefinition = ComplexTypeElement | SimpleTypeElement | ElementElement;

const XS_STRING: SoapType = {
    kind: 'simpleType',
    name: 'string',
    namespace: 'http://www.w3.org/2001/XMLSchema',
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
        }

        if (!inputContent.$lookupType) {
            // no args
            return undefined;
        }

        const ns = resolveNamespace(inputContent);
        const inputType = this.resolveWsdlNameToSoapType(
            ns,
            withoutNamespace(inputContent.$lookupType),
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
        const ns = resolveNamespace(outputContent);
        const outputType = this.resolveWsdlNameToSoapType(
            ns,
            withoutNamespace(outputContent.$lookupType),
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
        if (this.alreadyResolved.has(namespace + wsdlTypeName)) {
            this.debug(
                () =>
                    `resolved soap type for namespace: '${namespace}', typeName: '${wsdlTypeName}' from cache`,
            );
            return this.alreadyResolved.get(namespace + wsdlTypeName);
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
            };
            this.alreadyResolved.set(namespace + wsdlTypeName, soapType);

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
                    fields: null,
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
                    const ns = resolveNamespace(schemaObject);
                    const type = this.findXsdTypeDefinition(ns, schemaObject.$type);
                    const soapType = this.resolveWsdlNameToSoapType(
                        ns,
                        withoutNamespace(schemaObject.$lookupType),
                        `return type of element '${schemaObject.$name}`,
                    );
                    this.alreadyResolved.set(soapType.namespace + soapType.name, soapType);
                    return soapType;
                } else {
                    // must be anonymous
                    const soapType = this.resolveAnonymousTypeToSoapType(schemaObject, schemaObject.$name);
                    this.alreadyResolved.set(soapType.namespace + soapType.name, soapType);
                    return soapType;
                }
            default:
                soapType = XS_STRING;
                this.warn(
                    () =>
                        `unsupported element '${schemaObject.name}' as operation message part. Using string.`,
                );
        }

        this.alreadyResolved.set(namespace + wsdlTypeName, soapType);

        // resolve bindings (field types, base type) after type has been registered to resolve circular dependencies
        if (!(soapType instanceof ElementElement)) {
            try {
                this.resolveTypeBody(soapType, namespace, schemaObject);
            } catch (e) {
                if (soapType.kind === 'complexType') {
                    soapType.fields = undefined;
                } else {
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
        const namespace = resolveNamespace(xsdFieldDefinition);
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
        let baseTypeName: string = null;

        const body: Element = typeDefinition.children[0];
        switch (body?.constructor) {
            case SequenceElement:
                fields = this.extractChildren(body as SequenceElement);
                break;
            case ComplexContentElement:
                const extensionOrRestriction = body.children.find(
                    (child) =>
                        child instanceof ExtensionElement || child instanceof RestrictionElement,
                ) as ExtensionElement | RestrictionElement;
                baseTypeName = extensionOrRestriction.$base;
                const sequence: SequenceElement = extensionOrRestriction.children.find(
                    (child) => child instanceof SequenceElement,
                ) as SequenceElement;
                if (!sequence) {
                    this.warn(
                        () =>
                            `cannot parse fields for soap type '${typeName}' as currently only restrictions/extensions with sequence are supported. leaving fields empty`,
                    );
                    throw new Error('Unsupported xsd definition.');
                } else {
                    fields = this.extractChildren(sequence);
                }
                baseTypeName = withoutNamespace(extensionOrRestriction.$base);
                break;
            case SimpleTypeElement:
                const restriction = body.children.find(
                    (child) => child instanceof RestrictionElement,
                ) as RestrictionElement;
                baseTypeName = withoutNamespace(restriction.$base);
                break;
            default:
                this.warn(() => `cannot parse fields for soap type '${typeName}'`);
                fields = undefined;
        }

        // todo extract
        if (soapType.kind === 'complexType' && fields) {
            const soapFields: SoapField[] = fields.map((field: ElementElement) => {
                let type;
                if (field.$type) {
                    const ns = resolveNamespace(field);
                    type = this.resolveWsdlNameToSoapType(
                        ns,
                        withoutNamespace(field.$type),
                        `field '${field.$name}' of soap type '${soapType.name}'`,
                    );
                } else if (field.children.length) {
                    let generatedTypeName = `${soapType.name}_${capitalizeFirstLetter(
                        field.$name,
                    )}`;
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
            soapType.fields = soapFields;
        }

        const baseType: SoapComplexType = !baseTypeName
            ? null
            : <SoapComplexType>(
                  this.resolveWsdlNameToSoapType(
                      namespace,
                      baseTypeName,
                      `base type of soap type '${soapType.name}'`,
                  )
              );

        soapType.base = baseType;
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
}

function targetNamespace(content: any) {
    return content['targetNamespace'];
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

function resolveNamespace(element: ElementElement) {
    const prefix = namespacePrefix(element.$type || element.$lookupType);
    // if (element.ignoredNamespaces?.includes(prefix)) {
    //     return element.$targetNamespace
    // }
    return element.xmlns[prefix] || element.schemaXmlns[prefix] || element.$targetNamespace;
}
