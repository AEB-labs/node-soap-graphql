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
        expect(defaultOutputNameResolver({ name: null } as any)).to.not.exist;
        expect(defaultOutputNameResolver({ name: undefined } as any)).to.not.exist;
        expect(defaultOutputNameResolver({ name: '' } as any)).to.not.exist;

        expect(defaultOutputNameResolver({ name: 'a' } as any)).to.equal('A');
        expect(defaultOutputNameResolver({ name: 'A' } as any)).to.equal('A');

        expect(defaultOutputNameResolver({ name: 'ab' } as any)).to.equal('Ab');
        expect(defaultOutputNameResolver({ name: 'Ab' } as any)).to.equal('Ab');

        expect(defaultOutputNameResolver({ name: 'abc' } as any)).to.equal('Abc');
        expect(defaultOutputNameResolver({ name: 'Abc' } as any)).to.equal('Abc');

    }).timeout(10000);

    it('defaultInterfaceNameResolver', async () => {

        expect(defaultInterfaceNameResolver(null)).to.not.exist;
        expect(defaultInterfaceNameResolver(undefined)).to.not.exist;
        expect(defaultInterfaceNameResolver({ name: null } as any)).to.not.exist;
        expect(defaultInterfaceNameResolver({ name: undefined } as any)).to.not.exist;
        expect(defaultOutputNameResolver({ name: '' } as any)).to.not.exist;

        expect(defaultInterfaceNameResolver({ name: 'a' } as any)).to.equal('iA');
        expect(defaultInterfaceNameResolver({ name: 'A' } as any)).to.equal('iA');

        expect(defaultInterfaceNameResolver({ name: 'ab' } as any)).to.equal('iAb');
        expect(defaultInterfaceNameResolver({ name: 'Ab' } as any)).to.equal('iAb');

        expect(defaultInterfaceNameResolver({ name: 'abc' } as any)).to.equal('iAbc');
        expect(defaultInterfaceNameResolver({ name: 'Abc' } as any)).to.equal('iAbc');

    }).timeout(10000);

    it('defaultInputNameResolver', async () => {

        expect(defaultInputNameResolver(null)).to.not.exist;
        expect(defaultInputNameResolver(undefined)).to.not.exist;
        expect(defaultInputNameResolver({ name: null } as any)).to.not.exist;
        expect(defaultInputNameResolver({ name: undefined } as any)).to.not.exist;
        expect(defaultInputNameResolver({ name: '' } as any)).to.not.exist;

        expect(defaultInputNameResolver({ name: 'a' } as any)).to.equal('AInput');
        expect(defaultInputNameResolver({ name: 'A' } as any)).to.equal('AInput');

        expect(defaultInputNameResolver({ name: 'ab' } as any)).to.equal('AbInput');
        expect(defaultInputNameResolver({ name: 'Ab' } as any)).to.equal('AbInput');

        expect(defaultInputNameResolver({ name: 'abc' } as any)).to.equal('AbcInput');
        expect(defaultInputNameResolver({ name: 'Abc' } as any)).to.equal('AbcInput');

    }).timeout(10000);

});
