import { createClient, BasicAuthSecurity, Client, IOptions } from 'soap';

export type NodeSoapClient = any | Client;

export type NodeSoapOptions = {
    options?: IOptions;
    basicAuth?: {
        username: string;
        password: string;
    };
};

export async function createSoapClient(url: string, options: NodeSoapOptions = {}): Promise<NodeSoapClient> {
    return new Promise<any>((resolve, reject) => {
        createClient(url, options, (err: any, client: Client) => {
            if (err) {
                reject(err);
            } else {
                if (!!options.basicAuth) {
                    client.setSecurity(new BasicAuthSecurity(options.basicAuth.username, options.basicAuth.password));
                }
                resolve(client);
            }
        });
    });
}
