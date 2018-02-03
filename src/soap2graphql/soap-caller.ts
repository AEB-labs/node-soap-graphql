import { SoapOperation } from './soap-endpoint';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';

/**
 * Executes a call to a soap operation given the graphql input.
 */
export type SoapCaller =
    (
        operation: SoapOperation,
        graphqlSource: any,
        graphqlArgs: { [argName: string]: any },
        graphqlContext: any,
        graphqlInfo: GraphQLResolveInfo

    ) => Promise<any>
