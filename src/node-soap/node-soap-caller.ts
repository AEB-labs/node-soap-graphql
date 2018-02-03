import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapCaller } from '../soap2graphql/soap-caller';
import { NodeSoapClient } from './node-soap';
import { GraphQLResolveInfo } from 'graphql/type/definition';
import { inspect } from 'util';
import { Logger } from '../soap2graphql/logger';

export function createSoapCaller(soapClient: NodeSoapClient, logger: Logger): SoapCaller {
    return async (operation: SoapOperation, graphqlSource: any, graphqlArgs: { [argName: string]: any }, graphqlContext: any, graphqlInfo: GraphQLResolveInfo) => {
        return await callSoap(soapClient, operation, graphqlSource, graphqlArgs, graphqlContext, graphqlInfo, logger);
    };
}

function callSoap<S, C>(
    soapClient: NodeSoapClient,
    operation: SoapOperation,
    source: S,
    args: { [argName: string]: any },
    context: C,
    info: GraphQLResolveInfo,
    logger: Logger): Promise<any> {

    logger.debug(() => `call operation ${operation.name()} with args ${inspect(args, false, 5)}`);

    const requestMessage = {};
    Array.from(Object.keys(args)).forEach(key => {
        requestMessage[key] = deepCopy(args[key]);
    });
    return new Promise((resolve, reject) => {
        soapClient[operation.service().name()][operation.port().name()][operation.name()](requestMessage, (err, res) => {
            if (err) {
                reject(err);
            } else {
                logger.debug(() => `operation ${operation.name()} returned ${inspect(res, false, 5)}`);
                if (!operation.resultField()) {
                    // void operation
                    resolve(!res ? null : JSON.stringify(res));
                } else {
                    resolve(!res ? null : res[operation.resultField()]);
                }
            }
        });
    });

}

function deepCopy(obj: any): any {
    if (!obj) {
        return null;
    } else if (Object(obj) !== obj) {
        // primitive
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(e => deepCopy(e));
    } else {
        const corrected = Object.assign({}, obj);
        Array.from(Object.keys(corrected)).forEach(key => {
            const value = corrected[key];
            corrected[key] = deepCopy(value);
        });
        return corrected;
    }
}
