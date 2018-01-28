import { ScalarTypeResolver } from './scalar-type-resolver';
import { NameResolver } from './name-resolver';
import { SoapEndpoint } from './soap-endpoint';
import { SoapCaller } from './soap-caller';
import { GraphQLSchemaConfig } from 'graphql/type/schema';
import { SchemaResolver } from './schema-resolver';

export type SchemaOptions = {
    includeServices?: boolean;
    includePorts?: boolean;
    scalarResolver?: ScalarTypeResolver;
    outputNameResolver?: NameResolver;
    interfaceNameResolver?: NameResolver;
    inputNameResolver?: NameResolver;
}

export function createSchemaConfig(endpoint: SoapEndpoint, soapCaller: SoapCaller, options: SchemaOptions = {}): GraphQLSchemaConfig {
    return new SchemaResolver(endpoint, soapCaller, options).resolve();
}
