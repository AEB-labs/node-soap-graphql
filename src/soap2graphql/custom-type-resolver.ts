import { GraphQLScalarType, GraphQLString, GraphQLFloat, GraphQLBoolean, GraphQLInt, GraphQLOutputType, GraphQLInputType } from 'graphql';
import { GraphQLDateTime, GraphQLTime, GraphQLDate } from 'graphql-iso-date';
import { GraphQLID } from 'graphql/type/scalars';

export interface CustomTypeResolver {
    outputType(typeName: string): GraphQLOutputType;
    inputType(typeName: string): GraphQLInputType;
}

export class DefaultTypeResolver implements CustomTypeResolver {

    string = GraphQLString;
    base64Binary = GraphQLString;
    hexBinary = GraphQLString;
    duration = GraphQLString;
    gYearMonth = GraphQLString;
    gYear = GraphQLString;
    gMonthDay = GraphQLString;
    gDay = GraphQLString;
    gMonth = GraphQLString;
    anyURI = GraphQLString;
    QName = GraphQLString;
    normalizedString = GraphQLString;
    token = GraphQLString;
    NMTOKEN = GraphQLString;
    NMTOKENS = GraphQLString;
    language = GraphQLString;
    Name = GraphQLString;
    NCName = GraphQLString;
    IDREF = GraphQLString;
    IDREFS = GraphQLString;
    ENTITY = GraphQLString;
    ENTITIES = GraphQLString;

    ID = GraphQLID;

    boolean = GraphQLBoolean;

    byte = GraphQLInt;
    unsignedByte = GraphQLInt;
    short = GraphQLInt;
    unsignedShort = GraphQLInt;
    int = GraphQLInt;
    unsignedInt = GraphQLInt;
    integer = GraphQLInt;
    positiveInteger = GraphQLInt;
    nonPositiveInteger = GraphQLInt;
    negativeInteger = GraphQLInt;
    nonNegativeInteger = GraphQLInt;
    long = GraphQLInt;
    unsignedLong = GraphQLInt;

    decimal = GraphQLFloat;
    float = GraphQLFloat;
    double = GraphQLFloat;

    dateTime = GraphQLDateTime;
    date = GraphQLDate;
    time = GraphQLTime;

    resolve(typeName: string): GraphQLScalarType {
        return this[typeName];
    }

    outputType(typeName: string): GraphQLOutputType {
        return this.resolve(typeName);
    }

    inputType(typeName: string): GraphQLInputType {
        return this.resolve(typeName);
    }

}
