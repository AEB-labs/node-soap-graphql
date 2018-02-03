import { CustomTypeResolver } from './custom-type-resolver';
import { NameResolver } from './name-resolver';
import { SoapEndpoint } from './soap-endpoint';
import { SoapCaller } from './soap-caller';
import { GraphQLSchemaConfig } from 'graphql/type/schema';
import { SchemaResolver } from './schema-resolver';
import { Logger } from './logger';

export type SchemaOptions = {
    includeServices?: boolean;
    includePorts?: boolean;
    customResolver?: CustomTypeResolver;
    outputNameResolver?: NameResolver;
    interfaceNameResolver?: NameResolver;
    inputNameResolver?: NameResolver;
}

export function createSchemaConfig(endpoint: SoapEndpoint, soapCaller: SoapCaller, options: SchemaOptions = {}, logger: Logger): GraphQLSchemaConfig {
    return new SchemaResolver(endpoint, soapCaller, options, logger).resolve();
}
