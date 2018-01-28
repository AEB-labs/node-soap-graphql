import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, fail, it } from 'mocha';
import { defaultOutputNameResolver, defaultInterfaceNameResolver, defaultInputNameResolver } from '../../../src/soap2graphql/name-resolver';

chai.use(chaiAsPromised);

describe('name-resolver', () => {

    it('defaultOutputNameResolver', async () => {

        expect(defaultOutputNameResolver(null)).to.not.exist;
        expect(defaultOutputNameResolver(undefined)).to.not.exist;
        expect(defaultOutputNameResolver({ name: null })).to.not.exist;
        expect(defaultOutputNameResolver({ name: undefined })).to.not.exist;
        expect(defaultOutputNameResolver({ name: '' })).to.not.exist;

        expect(defaultOutputNameResolver({ name: 'a' })).to.equal('A');
        expect(defaultOutputNameResolver({ name: 'A' })).to.equal('A');

        expect(defaultOutputNameResolver({ name: 'ab' })).to.equal('Ab');
        expect(defaultOutputNameResolver({ name: 'Ab' })).to.equal('Ab');

        expect(defaultOutputNameResolver({ name: 'abc' })).to.equal('Abc');
        expect(defaultOutputNameResolver({ name: 'Abc' })).to.equal('Abc');

    }).timeout(10000);

    it('defaultInterfaceNameResolver', async () => {

        expect(defaultInterfaceNameResolver(null)).to.not.exist;
        expect(defaultInterfaceNameResolver(undefined)).to.not.exist;
        expect(defaultInterfaceNameResolver({ name: null })).to.not.exist;
        expect(defaultInterfaceNameResolver({ name: undefined })).to.not.exist;
        expect(defaultOutputNameResolver({ name: '' })).to.not.exist;

        expect(defaultInterfaceNameResolver({ name: 'a' })).to.equal('iA');
        expect(defaultInterfaceNameResolver({ name: 'A' })).to.equal('iA');

        expect(defaultInterfaceNameResolver({ name: 'ab' })).to.equal('iAb');
        expect(defaultInterfaceNameResolver({ name: 'Ab' })).to.equal('iAb');

        expect(defaultInterfaceNameResolver({ name: 'abc' })).to.equal('iAbc');
        expect(defaultInterfaceNameResolver({ name: 'Abc' })).to.equal('iAbc');

    }).timeout(10000);

    it('defaultInputNameResolver', async () => {

        expect(defaultInputNameResolver(null)).to.not.exist;
        expect(defaultInputNameResolver(undefined)).to.not.exist;
        expect(defaultInputNameResolver({ name: null })).to.not.exist;
        expect(defaultInputNameResolver({ name: undefined })).to.not.exist;
        expect(defaultInputNameResolver({ name: '' })).to.not.exist;

        expect(defaultInputNameResolver({ name: 'a' })).to.equal('AInput');
        expect(defaultInputNameResolver({ name: 'A' })).to.equal('AInput');

        expect(defaultInputNameResolver({ name: 'ab' })).to.equal('AbInput');
        expect(defaultInputNameResolver({ name: 'Ab' })).to.equal('AbInput');

        expect(defaultInputNameResolver({ name: 'abc' })).to.equal('AbcInput');
        expect(defaultInputNameResolver({ name: 'Abc' })).to.equal('AbcInput');

    }).timeout(10000);

});
