import { createClient, BasicAuthSecurity, Client, IOptions, WSDL } from 'soap';
import { defaultAttributesKey } from '../soap2graphql/name-resolver';

/**
 * Type for the soap-client from node-soap.
 */
export type NodeSoapClient = any | Client;

export type NodeSoapWsdl = any | WSDL;

/**
 * Creation options for a node-soap client.
 */
export type NodeSoapOptions = {
    options?: IOptions;
    /**
     * For convenience:
     * If set, the security of the created node-soap client will be set to basic-auth with the given options.
     */
    basicAuth?: {
        username: string;
        password: string;
    };
};

export async function createSoapClient(
    url: string,
    options: NodeSoapOptions = {},
    attributesKey: string,
): Promise<NodeSoapClient> {
    const opts: IOptions = !options.options
        ? { attributesKey }
        : { ...options.options, attributesKey };
    return new Promise<any>((resolve, reject) => {
        try {
            createClient(url, opts, (err: any, client: Client) => {
                if (err) {
                    reject(err);
                } else {
                    if (!!options.basicAuth) {
                        client.setSecurity(
                            new BasicAuthSecurity(
                                options.basicAuth.username,
                                options.basicAuth.password,
                            ),
                        );
                    }
                    resolve(client);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}
