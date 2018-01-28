import { SoapOperation } from '../soap2graphql/soap-endpoint';
import { SoapCaller } from '../soap2graphql/soap-caller';
import { SoapClient } from './node-soap';
import { GraphQLResolveInfo } from 'graphql/type/definition';

export function createSoapCaller(soapClient: SoapClient): SoapCaller {
    return async (operation: SoapOperation, graphQlSource: any, graphQlArgs: { [argName: string]: any }, graphQlContext: any, graphQlInfo: GraphQLResolveInfo) => {
        return await callSoap(soapClient, operation, graphQlSource, graphQlArgs, graphQlContext, graphQlInfo);
    };
}

function callSoap<S, C>(
    soapClient: SoapClient,
    operation: SoapOperation,
    source: S,
    args: { [argName: string]: any },
    context: C,
    info: GraphQLResolveInfo): Promise<any> {

    const requestMessage = {};
    Array.from(Object.keys(args)).forEach(key => {
        requestMessage[key] = deepCopy(args[key]);
    });
    return new Promise((resolve, reject) => {
        soapClient[operation.service().name()][operation.port().name()][operation.name()](requestMessage, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(!res ? null : res.result);
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
