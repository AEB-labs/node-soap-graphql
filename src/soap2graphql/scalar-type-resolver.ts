import { GraphQLScalarType, GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLInt } from 'graphql';
import { GraphQLDateTime, GraphQLTime, GraphQLDate } from 'graphql-iso-date';

export interface ScalarTypeResolver {
    resolve(wsdlTypeName: string): GraphQLScalarType;
}

// @todo match with https://www.w3.org/TR/xmlschema-2/#built-in-primitive-datatypes
export class DefaultScalarTypeResolver implements ScalarTypeResolver {

    string = GraphQLString;
    base64Binary = GraphQLString;

    boolean = GraphQLBoolean;

    short = GraphQLInt;
    int = GraphQLInt;
    long = GraphQLInt;
    unsignedLong = GraphQLInt;

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
