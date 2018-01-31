import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, fail, it } from 'mocha';
import { defaultOutputNameResolver, defaultInterfaceNameResolver, defaultInputNameResolver } from '../../../src/soap2graphql/name-resolver';
import { DefaultScalarTypeResolver } from '../../../src/soap2graphql/scalar-type-resolver';
import { GraphQLInt, GraphQLString, GraphQLBoolean, GraphQLFloat } from 'graphql/type/scalars';
import { GraphQLDateTime, GraphQLTime, GraphQLDate } from 'graphql-iso-date';

chai.use(chaiAsPromised);

describe('default scalar type resolver', () => {

    it('resolves default scalar types', async () => {

        const resolver = new DefaultScalarTypeResolver();

        expect(resolver.resolve(null)).to.not.exist;
        expect(resolver.resolve(undefined)).to.not.exist;

        expect(resolver.resolve('lalal')).to.not.exist;
        
        expect(resolver.resolve('string')).to.equal(GraphQLString);
        expect(resolver.resolve('base64Binary')).to.equal(GraphQLString);
        
        expect(resolver.resolve('boolean')).to.equal(GraphQLBoolean);
        
        expect(resolver.resolve('short')).to.equal(GraphQLInt);
        expect(resolver.resolve('int')).to.equal(GraphQLInt);
        expect(resolver.resolve('long')).to.equal(GraphQLInt);
        
        expect(resolver.resolve('decimal')).to.equal(GraphQLFloat);
        expect(resolver.resolve('float')).to.equal(GraphQLFloat);
        expect(resolver.resolve('double')).to.equal(GraphQLFloat);
        
        expect(resolver.resolve('dateTime')).to.equal(GraphQLDateTime);
        expect(resolver.resolve('date')).to.equal(GraphQLDate);
        expect(resolver.resolve('time')).to.equal(GraphQLTime);

    }).timeout(10000);
});
