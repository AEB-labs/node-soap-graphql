import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapCaller, SoapCallInput } from '../soap2graphql/soap-caller';
import { NodeSoapClient } from './node-soap';
import { GraphQLResolveInfo } from 'graphql/type/definition';
import { inspect } from 'util';
import { Logger } from '../soap2graphql/logger';

export class NodeSoapCaller implements SoapCaller {

    constructor(protected soapClient: NodeSoapClient, protected logger: Logger) {
    }

    async call(input: SoapCallInput): Promise<any> {
        if (!!this.logger) {
            this.logger.debug(() => `call operation '${input.operation.name()}' with args '${inspect(input.graphqlArgs, false, 5)}'`);
        }

        const requestMessage: any = await this.createSoapRequestMessage(input);

        const requestFunction: (requestMessage: any, callback: (err: any, res: any) => void) => void =
            this.soapClient[input.operation.service().name()][input.operation.port().name()][input.operation.name()];

        return await new Promise((resolve, reject) => {
            try {
                requestFunction(requestMessage, async (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        try {
                            if (!!this.logger) {
                                this.logger.debug(() => `operation '${input.operation.name()}' returned '${inspect(res, false, 5)}'`);
                            }
                            resolve(await this.createGraphqlResult(input, res));
                        } catch (err) {
                            reject(err);
                        }
                    }
                });
            } catch (err) { reject(err); }
        });
    }

    protected async createSoapRequestMessage(input: SoapCallInput): Promise<any> {
        const requestMessage = {};
        Array.from(Object.keys(input.graphqlArgs)).forEach(key => {
            requestMessage[key] = this.deepCopy(input.graphqlArgs[key]);
        });
        return requestMessage;
    }

    protected async createGraphqlResult(input: SoapCallInput, result: any): Promise<any> {
        if (!!this.logger) {
            this.logger.debug(() => `operation '${input.operation.name()}' returned '${inspect(result, false, 5)}'`);
        }

        if (!input.operation.resultField()) {
            // void operation
            return !result ? null : JSON.stringify(result);
        } else {
            return !result ? null : result[input.operation.resultField()];
        }
    }

    protected deepCopy(obj: any): any {
        if (!obj) {
            return null;
        } else if (Object(obj) !== obj) {
            // primitive
            return obj;
        } else if (Array.isArray(obj)) {
            return obj.map(e => this.deepCopy(e));
        } else {
            const corrected = Object.assign({}, obj);
            Array.from(Object.keys(corrected)).forEach(key => {
                const value = corrected[key];
                corrected[key] = this.deepCopy(value);
            });
            return corrected;
        }
    }

}
