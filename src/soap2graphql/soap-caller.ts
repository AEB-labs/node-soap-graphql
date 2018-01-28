import { SoapOperation } from './soap-endpoint';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';

/**
 * Executes a call to a soap operation given the graphql input.
 */
export type SoapCaller =
    (
        operation: SoapOperation,
        graphQlSource: any,
        graphQlArgs: { [argName: string]: any },
        graphQlContext: any,
        graphQlInfo: GraphQLResolveInfo

    ) => Promise<any>
