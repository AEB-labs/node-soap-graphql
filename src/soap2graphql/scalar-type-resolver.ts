import { GraphQLScalarType, GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLInt } from 'graphql';
import { GraphQLDateTime, GraphQLTime, GraphQLDate } from 'graphql-iso-date';

export interface ScalarTypeResolver {
    resolve(wsdlTypeName: string): GraphQLScalarType;
}

export class DefaultScalarTypeResolver implements ScalarTypeResolver {

    string = GraphQLString;
    base64Binary = GraphQLString;

    boolean = GraphQLBoolean;

    int = GraphQLInt;
    short = GraphQLInt;

    decimal = GraphQLFloat;
    float = GraphQLFloat;
    double = GraphQLFloat;

    dateTime = GraphQLDateTime;
    date = GraphQLDate;
    time = GraphQLTime;

    resolve(wsdlTypeName: string): GraphQLScalarType {
        return this[wsdlTypeName];
    }

}
