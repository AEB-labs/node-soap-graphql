import { soapGraphqlSchema, SoapGraphQlOptions } from './src/soap-graphql';
import { SoapCaller } from './src/soap2graphql/soap-caller';
import { NameResolver } from './src/soap2graphql/name-resolver';
import { CustomTypeResolver } from './src/soap2graphql/scalar-type-resolver';
import { createSoapClient } from './src/node-soap/node-soap';

export {
    SoapGraphQlOptions,
    soapGraphqlSchema,
    SoapCaller,
    NameResolver,
    CustomTypeResolver,
};
