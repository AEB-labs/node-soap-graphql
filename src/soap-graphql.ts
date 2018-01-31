import { SoapClient, NodeSoapOptions, createSoapClient } from './node-soap/node-soap';
import { SchemaOptions, createSchemaConfig } from './soap2graphql/soap2graphql';
import { SoapCaller } from './soap2graphql/soap-caller';
import { GraphQLSchema, GraphQLSchemaConfig } from 'graphql/type/schema';
import { SoapEndpoint } from './soap2graphql/soap-endpoint';
import { createSoapEndpoint } from './node-soap/node-soap-endpoint';
import { createSoapCaller } from './node-soap/node-soap-caller';

export type SoapGraphQlOptions = {
    soapClient?: SoapClient;
    createClient?: {
        url: string;
        options?: NodeSoapOptions;
    };
    schemaOptions?: SchemaOptions;
    soapCaller?: SoapCaller;
    debug?: boolean;
}

export async function soapGraphqlSchema(options: SoapGraphQlOptions | string): Promise<GraphQLSchema> {
    return new GraphQLSchema(await soapGraphqlSchemaConfig(options));
}

export async function soapGraphqlSchemaConfig(options: SoapGraphQlOptions | string): Promise<GraphQLSchemaConfig> {
    if (typeof options === 'string') {
        options = {
            createClient: {
                url: options
            }
        }
    }

    const soapClient: SoapClient = await useSoapClient(options);
    const wsdl: SoapEndpoint = await createSoapEndpoint(soapClient, options.debug);

    if (!options.soapCaller) {
        options.soapCaller = createSoapCaller(soapClient, options.debug);
    }

    return await createSchemaConfig(wsdl, options.soapCaller, options.schemaOptions);
}

async function useSoapClient(options: SoapGraphQlOptions): Promise<SoapClient> {
    if (!!options.soapClient) {
        return options.soapClient;
    }
    if (!!options.createClient) {
        return await createSoapClient(options.createClient.url, options.createClient.options);
    }
    throw new Error('neither soap client nor node-soap creation options provided');
}
