import { createClient, BasicAuthSecurity, Client, IOptions, WSDL } from 'soap';

export type NodeSoapClient = any | Client;
export type NodeSoapWsdl = any | WSDL;

export type NodeSoapOptions = {
    options?: IOptions;
    basicAuth?: {
        username: string;
        password: string;
    };
};

export async function createSoapClient(url: string, options: NodeSoapOptions = {}): Promise<NodeSoapClient> {
    const opts: IOptions = !options.options ? {} : options.options;
    return new Promise<any>((resolve, reject) => {
        try {
            createClient(url, opts, (err: any, client: Client) => {
                if (err) {
                    reject(err);
                } else {
                    if (!!options.basicAuth) {
                        client.setSecurity(new BasicAuthSecurity(options.basicAuth.username, options.basicAuth.password));
                    }
                    resolve(client);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}
