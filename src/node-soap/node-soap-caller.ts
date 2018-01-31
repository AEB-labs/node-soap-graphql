import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapCaller } from '../soap2graphql/soap-caller';
import { SoapClient } from './node-soap';
import { GraphQLResolveInfo } from 'graphql/type/definition';
import { inspect } from 'util';

export function createSoapCaller(soapClient: SoapClient, debug: boolean): SoapCaller {
    return async (operation: SoapOperation, graphQlSource: any, graphQlArgs: { [argName: string]: any }, graphQlContext: any, graphQlInfo: GraphQLResolveInfo) => {
        return await callSoap(soapClient, operation, graphQlSource, graphQlArgs, graphQlContext, graphQlInfo, debug);
    };
}

function callSoap<S, C>(
    soapClient: SoapClient,
    operation: SoapOperation,
    source: S,
    args: { [argName: string]: any },
    context: C,
    info: GraphQLResolveInfo,
    debug: boolean): Promise<any> {

    if (!!debug) {
        console.log(`call operation ${operation.name()} with args ${inspect(args, false, 5)}`);
    }

    const requestMessage = {};
    Array.from(Object.keys(args)).forEach(key => {
        requestMessage[key] = deepCopy(args[key]);
    });
    return new Promise((resolve, reject) => {
        soapClient[operation.service().name()][operation.port().name()][operation.name()](requestMessage, (err, res) => {
            if (err) {
                reject(err);
            } else {
                if (!!debug) {
                    console.log(`operation ${operation.name()} returned ${inspect(res, false, 5)}`);
                }
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
