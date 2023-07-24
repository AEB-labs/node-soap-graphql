import { SchemaOptions } from './soap2graphql';
import {
    defaultAttributesKey,
    defaultInputNameResolver,
    defaultInterfaceNameResolver,
    defaultOutputNameResolver,
    defaultScalarNameResolver,
} from './name-resolver';
import { DefaultTypeResolver } from './custom-type-resolver';
import { GraphQLSchemaConfig } from 'graphql/type/schema';
import { GraphQLString } from 'graphql/type/scalars';
import {
    SoapAttribute,
    SoapComplexType,
    SoapEndpoint,
    SoapField,
    SoapOperation,
    SoapPort,
    SoapService,
    SoapSimpleType,
    SoapType,
} from './soap-endpoint';
import { SoapCaller } from './soap-caller';
import { inspect } from 'util';
import {
    GraphQLFieldConfig,
    GraphQLFieldConfigArgumentMap,
    GraphQLFieldConfigMap,
    GraphQLFieldResolver,
    GraphQLInputFieldConfigMap,
    GraphQLInputObjectType,
    GraphQLInputObjectTypeConfig,
    GraphQLInputType,
    GraphQLInterfaceType,
    GraphQLInterfaceTypeConfig,
    GraphQLList,
    GraphQLObjectType,
    GraphQLObjectTypeConfig,
    GraphQLOutputType,
    GraphQLResolveInfo,
    GraphQLScalarType,
} from 'graphql';
import { Logger } from './logger';
import { GraphQLJSON } from 'graphql-scalars';

export class SchemaResolver {
    private readonly options: SchemaOptions;

    private outputResolver: GraphqlOutputFieldResolver = null;
    private inputResolver: GraphqlInputFieldResolver = null;
    private scalarResolver: GraphQLScalarResolver;

    constructor(
        private soapEndpoint: SoapEndpoint,
        private soapCaller: SoapCaller,
        options: SchemaOptions,
        private logger: Logger,
    ) {
        this.options = this.defaultOptions(options);
        this.scalarResolver = new GraphQLScalarResolver(this.options, this.logger);
    }

    defaultOptions(options: SchemaOptions) {
        options = !options ? {} : Object.assign({}, options);

        if (!options.outputNameResolver) {
            options.outputNameResolver = defaultOutputNameResolver;
        }
        if (!options.interfaceNameResolver) {
            options.interfaceNameResolver = defaultInterfaceNameResolver;
        }
        if (!options.inputNameResolver) {
            options.inputNameResolver = defaultInputNameResolver;
        }
        if (!options.scalarNameResolver) {
            options.scalarNameResolver = defaultScalarNameResolver;
        }

        if (!options.customResolver) {
            options.customResolver = new DefaultTypeResolver();
        }

        if (!options.attributesKey) {
            options.attributesKey = defaultAttributesKey;
        }

        return options;
    }

    resolve(): GraphQLSchemaConfig {
        this.outputResolver = new GraphqlOutputFieldResolver(
            this.scalarResolver,
            this.options,
            this.logger,
        );
        this.inputResolver = new GraphqlInputFieldResolver(
            this.scalarResolver,
            this.options,
            this.logger,
        );

        return {
            query: this.createQueryObject(),
            mutation: this.createMutationObject(),
        };
    }

    createQueryObject(): GraphQLObjectType {
        return new GraphQLObjectType({
            name: 'Query',
            fields: {
                description: {
                    type: GraphQLString,
                    resolve: () => {
                        return this.soapEndpoint.description();
                    },
                },
            },
        });
    }

    createMutationObject(): GraphQLObjectType {
        const fieldsThunk = (): GraphQLFieldConfigMap<any, any> => {
            const fields: GraphQLFieldConfigMap<any, any> = {};

            this.soapEndpoint.services().forEach((service: SoapService) => {
                if (!!this.options.includeServices) {
                    fields[service.name()] = this.createSoapServiceField(service);
                } else if (!!this.options.includePorts) {
                    service.ports().forEach((port: SoapPort) => {
                        fields[port.name()] = this.createSoapPortField(service, port);
                    });
                } else {
                    service.ports().forEach((port: SoapPort) => {
                        port.operations().forEach((operation: SoapOperation) => {
                            fields[operation.name()] = this.createSoapOperationField(operation);
                        });
                    });
                }
            });

            return fields;
        };

        return new GraphQLObjectType({
            name: 'Mutation',
            fields: fieldsThunk,
        });
    }

    createSoapServiceField(service: SoapService): GraphQLFieldConfig<any, any> {
        const fieldsThunk = (): GraphQLFieldConfigMap<any, any> => {
            const fields: GraphQLFieldConfigMap<any, any> = {};

            service.ports().forEach((port: SoapPort) => {
                if (!!this.options.includePorts) {
                    fields[port.name()] = this.createSoapPortField(service, port);
                } else {
                    port.operations().forEach((operation: SoapOperation) => {
                        fields[operation.name()] = this.createSoapOperationField(operation);
                    });
                }
            });

            return fields;
        };

        const returnType = new GraphQLObjectType({
            name: service.name() + 'Service',
            description: `Service ${service.name()}`,
            fields: fieldsThunk,
        });

        return {
            type: returnType,
            description: `Service ${service.name()}`,
            resolve: () => {
                return {};
            },
        };
    }

    createSoapPortField(service: SoapService, port: SoapPort): GraphQLFieldConfig<any, any> {
        const fieldsThunk = (): GraphQLFieldConfigMap<any, any> => {
            const fields: GraphQLFieldConfigMap<any, any> = {};

            port.operations().forEach((operation: SoapOperation) => {
                fields[operation.name()] = this.createSoapOperationField(operation);
            });

            return fields;
        };

        const returnType = new GraphQLObjectType({
            name: port.name() + 'Port',
            description: `Port ${port.name()}, service ${service.name()}`,
            fields: fieldsThunk,
        });

        return {
            type: returnType,
            description: `Port ${port.name()}, service ${service.name()}`,
            resolve: () => {
                return {};
            },
        };
    }

    createSoapOperationField(operation: SoapOperation): GraphQLFieldConfig<any, any> {
        const args: GraphQLFieldConfigArgumentMap = this.createSoapOperationFieldArgs(operation);
        const returnType: GraphQLOutputType = this.resolveSoapOperationReturnType(operation);
        const resolver: GraphQLFieldResolver<any, any, any> =
            this.createSoapOperationFieldResolver(operation);
        return {
            type: returnType,
            description: `Operation ${operation.name()}, port ${operation
                .port()
                .name()}, service ${operation.service().name()}`,
            args: args,
            resolve: resolver,
        };
    }

    createSoapOperationFieldArgs(operation: SoapOperation): GraphQLFieldConfigArgumentMap {
        const args: GraphQLFieldConfigArgumentMap = {};
        const inputType = operation.inputType();
        switch (inputType.kind) {
            case 'complexType':
                const gqlInputType = this.inputResolver.resolve({
                    type: operation.inputType(),
                }) as GraphQLInputObjectType;
                return gqlInputType.getFields();
            case 'simpleType':
                args['input'] = { type: this.scalarResolver.resolve(inputType) };
        }
        return args;
    }

    resolveSoapOperationReturnType(operation: SoapOperation): GraphQLOutputType {
        return this.outputResolver.resolve(operation.output());
    }

    createSoapOperationFieldResolver<TSource, TContext>(
        operation: SoapOperation,
    ): GraphQLFieldResolver<TSource, { [argName: string]: any }, TContext> {
        return async (
            graphqlSource: TSource,
            graphqlArgs: { [argName: string]: any },
            graphqlContext: TContext,
            graphqlInfo: GraphQLResolveInfo,
        ) => {
            return await this.soapCaller.call({
                operation: operation,
                graphqlSource: graphqlSource,
                graphqlArgs: graphqlArgs,
                graphqlContext: graphqlContext,
                graphqlInfo: graphqlInfo,
            });
        };
    }
}

class GraphqlOutputFieldResolver {
    private alreadyResolvedOutputTypes: Map<SoapType, GraphQLOutputType> = new Map();
    private alreadyResolvedInterfaceTypes: Map<SoapType, GraphQLInterfaceType> = new Map();

    constructor(
        private scalarResolver: GraphQLScalarResolver,
        private options: SchemaOptions,
        private logger: Logger,
    ) {}

    resolve(input: { type: SoapType; isList?: boolean }): GraphQLOutputType {
        try {
            const type: GraphQLOutputType = this.resolveOutputType(input.type);
            return input.isList ? new GraphQLList(type) : type;
        } catch (err) {
            const errStacked = new Error(
                `could not resolve output type for ${inspect(input, false, 4)}`,
            );
            errStacked.stack += '\nCaused by: ' + err.stack;
            throw errStacked;
        }
    }

    private resolveOutputType(soapType: SoapType): GraphQLOutputType {
        if (this.alreadyResolvedOutputTypes.has(soapType)) {
            return this.alreadyResolvedOutputTypes.get(soapType);
        }
        const customType: GraphQLOutputType = this.options.customResolver.outputType(
            soapType.name,
            soapType.namespace,
        );
        if (!!customType) {
            this.alreadyResolvedOutputTypes.set(soapType, customType);
            return customType;
        }
        if (soapType.kind === 'simpleType') {
            return this.scalarResolver.resolveScalar(soapType);
        } else {
            const type: GraphQLObjectType | GraphQLScalarType = this.createObjectType(soapType);
            if (!!type) {
                this.alreadyResolvedOutputTypes.set(soapType, type);
                return type;
            }
        }

        this.logger.warn(
            () => `could not resolve output type '${soapType}'; using GraphQLString instead`,
        );
        this.alreadyResolvedOutputTypes.set(soapType, GraphQLString);
        return GraphQLString;
    }

    private createObjectType(soapType: SoapComplexType): GraphQLObjectType | GraphQLScalarType {
        if (soapType.fields == undefined) {
            // something has gone wrong during type resolution to be able to continue untyped in cases of sudden unavailability of xsd sources etc.
            return GraphQLJSON;
        }
        return new GraphQLObjectType(this.createObjectTypeConfig(soapType));
    }

    private createObjectTypeConfig(soapType: SoapComplexType): GraphQLObjectTypeConfig<any, any> {
        const fields = (): GraphQLFieldConfigMap<any, any> => {
            const fieldMap: GraphQLFieldConfigMap<any, any> = {};
            this.appendObjectTypeFields(fieldMap, soapType);
            this.appendAttributesType(fieldMap, soapType);
            if (Object.keys(fieldMap).length == 0) {
                fieldMap['dummy'] = {
                    type: GraphQLString,
                    description: 'Artificial field, do not use.',
                };
            }
            return fieldMap;
        };

        const interfaces = (): GraphQLInterfaceType[] => {
            const interfaces: GraphQLInterfaceType[] = [];
            this.appendInterfaces(interfaces, soapType);
            return interfaces;
        };

        return {
            name: this.options.outputNameResolver(soapType),
            fields: fields,
            interfaces: interfaces,
        };
    }

    private appendObjectTypeFields(
        fieldMap: GraphQLFieldConfigMap<any, any>,
        soapType: SoapComplexType,
    ): void {
        this.appendTypeFields(fieldMap, soapType);
    }

    private appendInterfaces(interfaces: GraphQLInterfaceType[], soapType: SoapComplexType): void {
        // we only add interfaces with fields
        if (!!soapType.base && this.hasInterfaceFieldsRecursive(soapType.base)) {
            interfaces.push(this.resolveInterfaceType(soapType.base));
            this.appendInterfaces(interfaces, soapType.base);
        }
    }

    private hasInterfaceFieldsRecursive(soapType: SoapComplexType) {
        if (soapType.fields.length) {
            return true;
        }
        return soapType.base && this.hasInterfaceFieldsRecursive(soapType.base);
    }

    private resolveInterfaceType(soapType: SoapComplexType): GraphQLInterfaceType {
        if (this.alreadyResolvedInterfaceTypes.has(soapType)) {
            return this.alreadyResolvedInterfaceTypes.get(soapType);
        }

        const interfaceType: GraphQLInterfaceType = this.createInterfaceType(soapType);
        this.alreadyResolvedInterfaceTypes.set(soapType, interfaceType);
        return interfaceType;
    }

    private createInterfaceType(soapType: SoapComplexType): GraphQLInterfaceType {
        return new GraphQLInterfaceType(this.createInterfaceTypeConfig(soapType));
    }

    private createInterfaceTypeConfig(
        soapType: SoapComplexType,
    ): GraphQLInterfaceTypeConfig<any, any> {
        const fields = (): GraphQLFieldConfigMap<any, any> => {
            const fieldMap: GraphQLFieldConfigMap<any, any> = {};
            this.appendInterfaceTypeFields(fieldMap, soapType);
            if (Object.keys(fieldMap).length == 0) {
                fieldMap['dummy'] = {
                    type: GraphQLString,
                    description: 'Artificial field, do not use.',
                };
            }
            return fieldMap;
        };

        return {
            name: this.options.interfaceNameResolver(soapType),
            fields: fields,
            // should never be called, since the schema will not contain ambigous return types
            resolveType: (value: any, context: any, info: GraphQLResolveInfo) => {
                throw Error('no interface resolving available');
            },
        };
    }

    private appendInterfaceTypeFields(
        fieldMap: GraphQLFieldConfigMap<any, any>,
        soapType: SoapComplexType,
    ): void {
        this.appendTypeFields(fieldMap, soapType);
    }

    private appendTypeFields(
        fieldMap: GraphQLFieldConfigMap<any, any>,
        soapType: SoapComplexType,
    ): void {
        soapType.fields.forEach((soapField: SoapField) => {
            fieldMap[soapField.name] = {
                type: this.resolve(soapField),
            };
        });
        if (!!soapType.base) {
            this.appendTypeFields(fieldMap, soapType.base);
        }
    }

    private appendAttributesType(
        fieldMap: GraphQLFieldConfigMap<any, any>,
        soapType: SoapComplexType,
    ): void {
        if (soapType.attributes?.length) {
            const attributesFieldMap: GraphQLFieldConfigMap<any, any> = {};
            soapType.attributes.forEach((soapAttribute: SoapAttribute) => {
                attributesFieldMap[soapAttribute.name] = {
                    type: this.resolve(soapAttribute),
                };
            });
            fieldMap[this.options.attributesKey] = {
                description: `Attribute values for '${soapType.name}'`,
                type: new GraphQLObjectType({
                    name: `${soapType.name}_Attributes`,
                    description: `Attribute values for '${soapType.name}'`,
                    fields: attributesFieldMap,
                }),
            };
        }
    }
}

class GraphQLScalarResolver {
    private alreadyResolved: Map<SoapType, GraphQLScalarType> = new Map();

    constructor(private options: SchemaOptions, private logger: Logger) {}

    resolve(type: SoapSimpleType): GraphQLScalarType {
        try {
            return this.resolveScalar(type);
        } catch (err) {
            const errStacked = new Error(
                `could not resolve scalar type for ${inspect(type.name, false, 4)}`,
            );
            errStacked.stack += '\nCaused by: ' + err.stack;
            throw errStacked;
        }
    }

    resolveScalar(soapType: SoapType): GraphQLScalarType {
        if (this.alreadyResolved.has(soapType)) {
            return this.alreadyResolved.get(soapType);
        }
        const type = this.createScalarType(soapType as SoapSimpleType);
        if (!!type) {
            this.alreadyResolved.set(soapType, type);
            return type;
        }
        this.logger.warn(() => `could not resolve scalar type '${soapType}'; using GraphQLString`);
        this.alreadyResolved.set(soapType, GraphQLString);
        return GraphQLString;
    }

    private createScalarType(soapType: SoapSimpleType): GraphQLScalarType {
        return new GraphQLScalarType({
            ...soapType,
            name: this.options.inputNameResolver(soapType),
        });
    }
}

class GraphqlInputFieldResolver {
    private alreadyResolved: Map<SoapType, GraphQLInputType> = new Map();

    constructor(
        private scalarResolver: GraphQLScalarResolver,
        private options: SchemaOptions,
        private logger: Logger,
    ) {}

    resolve(input: { type: SoapType; isList?: boolean }): GraphQLInputType {
        try {
            const type: GraphQLInputType = this.resolveInputType(input.type);
            return input.isList ? new GraphQLList(type) : type;
        } catch (err) {
            const errStacked = new Error(
                `could not resolve output type for ${inspect(input, false, 4)}`,
            );
            errStacked.stack += '\nCaused by: ' + err.stack;
            throw errStacked;
        }
    }

    private resolveInputType(soapType: SoapType): GraphQLInputType {
        if (this.alreadyResolved.has(soapType)) {
            return this.alreadyResolved.get(soapType);
        }
        const customType: GraphQLInputType = this.options.customResolver.inputType(
            soapType.name,
            soapType.namespace,
        );
        if (!!customType) {
            this.alreadyResolved.set(soapType, customType);
            return customType;
        }

        if (soapType.kind == 'simpleType') {
            return this.scalarResolver.resolveScalar(soapType as SoapSimpleType);
        }
        const objectType: GraphQLInputObjectType | GraphQLScalarType = this.createObjectType(
            soapType as SoapComplexType,
        );
        if (!!objectType) {
            this.alreadyResolved.set(soapType, objectType);
            return objectType;
        }

        this.logger.warn(() => `could not resolve input type '${soapType}'; using GraphQLString`);
        this.alreadyResolved.set(soapType, GraphQLString);
        return GraphQLString;
    }

    private createObjectType(
        soapType: SoapComplexType,
    ): GraphQLInputObjectType | GraphQLScalarType {
        if (soapType.fields == undefined) {
            // something has gone wrong during type resolution to be able to continue untyped in cases of sudden unavailability of xsd sources etc.
            return GraphQLJSON;
        }
        return new GraphQLInputObjectType(this.createObjectTypeConfig(soapType));
    }

    private createObjectTypeConfig(soapType: SoapComplexType): GraphQLInputObjectTypeConfig {
        const fields = (): GraphQLInputFieldConfigMap => {
            const fieldMap: GraphQLInputFieldConfigMap = {};
            this.appendObjectTypeFields(fieldMap, soapType);
            this.appendAttributesType(fieldMap, soapType);
            if (Object.keys(fieldMap).length == 0) {
                fieldMap['dummy'] = {
                    type: GraphQLString,
                    description: 'Artificial field, do not use.',
                };
            }
            return fieldMap;
        };

        return {
            name: this.options.inputNameResolver(soapType),
            fields: fields,
        };
    }

    private appendObjectTypeFields(
        fieldMap: GraphQLInputFieldConfigMap,
        soapType: SoapComplexType,
    ): void {
        soapType.fields.forEach((soapField: SoapField) => {
            fieldMap[soapField.name] = {
                type: this.resolve(soapField),
            };
        });
        if (!!soapType.base) {
            this.appendObjectTypeFields(fieldMap, soapType.base);
        }
    }

    private appendAttributesType(
        fieldMap: GraphQLInputFieldConfigMap,
        soapType: SoapComplexType,
    ): void {
        if (soapType.attributes?.length) {
            const attributesFieldMap: GraphQLInputFieldConfigMap = {};
            soapType.attributes.forEach((soapAttribute: SoapAttribute) => {
                attributesFieldMap[soapAttribute.name] = {
                    type: this.resolve(soapAttribute),
                };
            });
            fieldMap[this.options.attributesKey] = {
                description: `Attribute values for '${soapType.name}'`,
                type: new GraphQLInputObjectType({
                    name: `${soapType.name}Input_Attributes`,
                    description: `Attribute values for '${soapType.name}'`,
                    fields: attributesFieldMap,
                }),
            };
        }
    }
}
