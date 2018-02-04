import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, fail, it } from 'mocha';
import { GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLFloat, GraphQLID } from 'graphql/type/scalars';
import { GraphQLDateTime, GraphQLTime, GraphQLDate } from 'graphql-iso-date';
import { DefaultTypeResolver } from '../../../src/soap2graphql/custom-type-resolver';

chai.use(chaiAsPromised);

describe('DefaultTypeResolver', () => {

    it('resolves default scalar types', async () => {

        const resolver = new DefaultTypeResolver();

        expect(resolver.resolve(null)).to.not.exist;
        expect(resolver.resolve(undefined)).to.not.exist;

        expect(resolver.resolve('lalal')).to.not.exist;

        expect(resolver.resolve('string')).to.equal(GraphQLString);
        expect(resolver.resolve('base64Binary')).to.equal(GraphQLString);
        expect(resolver.resolve('hexBinary')).to.equal(GraphQLString);
        expect(resolver.resolve('duration')).to.equal(GraphQLString);
        expect(resolver.resolve('gYearMonth')).to.equal(GraphQLString);
        expect(resolver.resolve('gYear')).to.equal(GraphQLString);
        expect(resolver.resolve('gMonthDay')).to.equal(GraphQLString);
        expect(resolver.resolve('gDay')).to.equal(GraphQLString);
        expect(resolver.resolve('gMonth')).to.equal(GraphQLString);
        expect(resolver.resolve('anyURI')).to.equal(GraphQLString);
        expect(resolver.resolve('QName')).to.equal(GraphQLString);
        expect(resolver.resolve('normalizedString')).to.equal(GraphQLString);
        expect(resolver.resolve('token')).to.equal(GraphQLString);
        expect(resolver.resolve('NMTOKEN')).to.equal(GraphQLString);
        expect(resolver.resolve('NMTOKENS')).to.equal(GraphQLString);
        expect(resolver.resolve('language')).to.equal(GraphQLString);
        expect(resolver.resolve('Name')).to.equal(GraphQLString);
        expect(resolver.resolve('NCName')).to.equal(GraphQLString);
        expect(resolver.resolve('IDREF')).to.equal(GraphQLString);
        expect(resolver.resolve('IDREFS')).to.equal(GraphQLString);
        expect(resolver.resolve('ENTITY')).to.equal(GraphQLString);
        expect(resolver.resolve('ENTITIES')).to.equal(GraphQLString);
        
        expect(resolver.resolve('ID')).to.equal(GraphQLID);
        
        expect(resolver.resolve('boolean')).to.equal(GraphQLBoolean);
        
        expect(resolver.resolve('byte')).to.equal(GraphQLInt);
        expect(resolver.resolve('unsignedByte')).to.equal(GraphQLInt);
        expect(resolver.resolve('short')).to.equal(GraphQLInt);
        expect(resolver.resolve('unsignedShort')).to.equal(GraphQLInt);
        expect(resolver.resolve('int')).to.equal(GraphQLInt);
        expect(resolver.resolve('unsignedInt')).to.equal(GraphQLInt);
        expect(resolver.resolve('integer')).to.equal(GraphQLInt);
        expect(resolver.resolve('positiveInteger')).to.equal(GraphQLInt);
        expect(resolver.resolve('nonPositiveInteger')).to.equal(GraphQLInt);
        expect(resolver.resolve('negativeInteger')).to.equal(GraphQLInt);
        expect(resolver.resolve('nonNegativeInteger')).to.equal(GraphQLInt);
        expect(resolver.resolve('long')).to.equal(GraphQLInt);
        expect(resolver.resolve('unsignedLong')).to.equal(GraphQLInt);
        
        expect(resolver.resolve('decimal')).to.equal(GraphQLFloat);
        expect(resolver.resolve('float')).to.equal(GraphQLFloat);
        expect(resolver.resolve('double')).to.equal(GraphQLFloat);
        
        expect(resolver.resolve('dateTime')).to.equal(GraphQLDateTime);
        expect(resolver.resolve('date')).to.equal(GraphQLDate);
        expect(resolver.resolve('time')).to.equal(GraphQLTime);

    }).timeout(10000);
});
