import { inspect } from 'util';
import { LateResolvedMessage, Logger } from '../soap2graphql/logger';
import { SoapCaller, SoapCallInput } from '../soap2graphql/soap-caller';
import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { NodeSoapClient } from './node-soap';

/**
 * Default implementation of SoapCaller for node-soap.
 */
export class NodeSoapCaller implements SoapCaller {

    constructor(protected soapClient: NodeSoapClient, protected logger: Logger) {
    }

    async call(input: SoapCallInput): Promise<any> {
        this.debug(() => `call operation '${input.operation.name()}' with args '${inspect(input.graphqlArgs, false, 5)}'`);

        const requestFunction: (requestMessage: any, callback: (err: any, res: any) => void) => void =
            this.requestFunctionForOperation(input.operation);

        const requestMessage: any = await this.createSoapRequestMessage(input);

        return await new Promise((resolve, reject) => {
            try {
                requestFunction(requestMessage, async (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        try {
                            resolve(await this.createGraphqlResult(input, res));
                        } catch (err) {
                            reject(err);
                        }
                    }
                });
            } catch (err) { reject(err); }
        });
    }

    protected requestFunctionForOperation(operation: SoapOperation): (requestMessage: any, callback: (err: any, res: any) => void) => void {
        return this.soapClient[operation.service().name()][operation.port().name()][operation.name()];
    }

    protected async createSoapRequestMessage(input: SoapCallInput): Promise<any> {
        const requestMessage = {};
        Array.from(Object.keys(input.graphqlArgs)).forEach(key => {
            // objects provided by GraphQL will usually lack default-functions like "hasOwnProperty"
            // so deep-copy all objects to ensure those functions are present
            requestMessage[key] = this.deepCopy(input.graphqlArgs[key]);
        });
        return requestMessage;
    }

    protected deepCopy(obj: any): any {
        if (obj == undefined || Object(obj) !== obj) {
            // null, undefined or primitive
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

    protected async createGraphqlResult(input: SoapCallInput, result: any): Promise<any> {
        this.debug(() => `operation '${input.operation.name()}' returned '${inspect(result, false, 5)}'`);

        if (!input.operation.resultField()) {
            // void operation
            return !result ? null : JSON.stringify(result);
        } else {
            return !result ? null : result[input.operation.resultField()];
        }
    }

    protected debug(message: LateResolvedMessage): void {
        if (!!this.logger) {
            this.logger.debug(message);
        }
    }

}
