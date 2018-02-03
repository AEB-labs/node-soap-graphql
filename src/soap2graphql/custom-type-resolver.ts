import { GraphQLScalarType, GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLInt, GraphQLOutputType, GraphQLInputType, GraphQLInterfaceType } from 'graphql';
import { GraphQLDateTime, GraphQLTime, GraphQLDate } from 'graphql-iso-date';

export interface CustomTypeResolver {
    outputType(typeName: string): GraphQLOutputType;
    inputType(typeName: string): GraphQLInputType;
}

// @todo match with https://www.w3.org/TR/xmlschema-2/#built-in-primitive-datatypes
export class DefaultTypeResolver implements CustomTypeResolver {

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

    outputType(typeName: string): GraphQLOutputType {
        return this.resolve(typeName);
    }

    inputType(typeName: string): GraphQLInputType {
        return this.resolve(typeName);
    }

}
