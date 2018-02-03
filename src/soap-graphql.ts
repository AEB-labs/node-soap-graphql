import { NodeSoapClient, NodeSoapOptions, createSoapClient } from './node-soap/node-soap';
import { SchemaOptions, createSchemaConfig } from './soap2graphql/soap2graphql';
import { SoapCaller } from './soap2graphql/soap-caller';
import { GraphQLSchema, GraphQLSchemaConfig } from 'graphql/type/schema';
import { SoapEndpoint } from './soap2graphql/soap-endpoint';
import { createSoapEndpoint } from './node-soap/node-soap-endpoint';
import { createSoapCaller } from './node-soap/node-soap-caller';
import { createLogger, Logger } from './soap2graphql/logger';

export type SoapGraphQlOptions = {
    soapClient?: NodeSoapClient;
    createClient?: {
        url: string;
        options?: NodeSoapOptions;
    };
    schemaOptions?: SchemaOptions;
    soapCaller?: SoapCaller;
    debug?: boolean;
    warnings?: boolean;
}

export async function soapGraphqlSchema(options: SoapGraphQlOptions | string): Promise<GraphQLSchema> {
    return new GraphQLSchema(await soapGraphqlSchemaConfig(options));
}

export async function soapGraphqlSchemaConfig(options: SoapGraphQlOptions | string): Promise<GraphQLSchemaConfig> {
    if (typeof options === 'string') {
        options = {
            createClient: {
                url: options
            },
            warnings: true,
            debug: false,
        };
    }

    const logger: Logger = createLogger(options.warnings, options.debug);

    const soapClient: NodeSoapClient = await useSoapClient(options);
    const wsdl: SoapEndpoint = await createSoapEndpoint(soapClient, logger);

    if (!options.soapCaller) {
        options.soapCaller = createSoapCaller(soapClient, options.debug);
    }

    return await createSchemaConfig(wsdl, options.soapCaller, options.schemaOptions, logger);
}

async function useSoapClient(options: SoapGraphQlOptions): Promise<NodeSoapClient> {
    if (!!options.soapClient) {
        return options.soapClient;
    }
    if (!!options.createClient) {
        return await createSoapClient(options.createClient.url, options.createClient.options);
    }
    throw new Error('neither soap client nor node-soap creation options provided');
}
