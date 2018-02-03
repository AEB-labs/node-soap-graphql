import { NodeSoapClient, NodeSoapOptions, createSoapClient } from './node-soap/node-soap';
import { SchemaOptions, createSchemaConfig } from './soap2graphql/soap2graphql';
import { SoapCaller } from './soap2graphql/soap-caller';
import { GraphQLSchema, GraphQLSchemaConfig } from 'graphql/type/schema';
import { SoapEndpoint } from './soap2graphql/soap-endpoint';
import { createSoapEndpoint, NodeSoapPort } from './node-soap/node-soap-endpoint';
import { createLogger, Logger } from './soap2graphql/logger';
import { NodeSoapCaller } from './node-soap/node-soap-caller';

export type SoapGraphqlOptions = {
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

export async function soapGraphqlSchema(options: SoapGraphqlOptions | string): Promise<GraphQLSchema> {
    return new GraphQLSchema(await soapGraphqlSchemaConfig(options));
}

export async function soapGraphqlSchemaConfig(options: SoapGraphqlOptions | string): Promise<GraphQLSchemaConfig> {
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
        options.soapCaller = new NodeSoapCaller(soapClient, logger);
    }

    return await createSchemaConfig(wsdl, options.soapCaller, options.schemaOptions, logger);
}

async function useSoapClient(options: SoapGraphqlOptions): Promise<NodeSoapClient> {
    if (!!options.soapClient) {
        return options.soapClient;
    }
    if (!!options.createClient) {
        return await createSoapClient(options.createClient.url, options.createClient.options);
    }
    throw new Error('neither soap client nor node-soap creation options provided');
}
