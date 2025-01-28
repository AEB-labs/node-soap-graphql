import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, fail, it } from 'mocha';
import {
    defaultOutputNameResolver,
    defaultInterfaceNameResolver,
    defaultInputNameResolver,
} from '../../../src/soap2graphql/name-resolver';

chai.use(chaiAsPromised);

describe('name-resolver', () => {
    it('defaultOutputNameResolver', async () => {
        expect(defaultOutputNameResolver(null)).to.not.exist;
        expect(defaultOutputNameResolver(undefined)).to.not.exist;
        expect(defaultOutputNameResolver({ name: null, namespace: 'N' } as any)).to.not.exist;
        expect(defaultOutputNameResolver({ name: undefined, namespace: 'N' } as any)).to.not.exist;
        expect(defaultOutputNameResolver({ name: '', namespace: 'N' } as any)).to.not.exist;

        expect(defaultOutputNameResolver({ name: 'a', namespace: '' } as any)).to.equal('_A');
        expect(defaultOutputNameResolver({ name: 'A', namespace: '' } as any)).to.equal('_A');

        expect(defaultOutputNameResolver({ name: 'a', namespace: 'n' } as any)).to.equal('N_A');
        expect(defaultOutputNameResolver({ name: 'A', namespace: 'N' } as any)).to.equal('N_A');

        expect(defaultOutputNameResolver({ name: 'ab', namespace: 'N' } as any)).to.equal('N_Ab');
        expect(defaultOutputNameResolver({ name: 'Ab', namespace: 'N' } as any)).to.equal('N_Ab');

        expect(defaultOutputNameResolver({ name: 'abc', namespace: 'N' } as any)).to.equal('N_Abc');
        expect(defaultOutputNameResolver({ name: 'Abc', namespace: 'N' } as any)).to.equal('N_Abc');
    }).timeout(10000);

    it('defaultInterfaceNameResolver', async () => {
        expect(defaultInterfaceNameResolver(null)).to.not.exist;
        expect(defaultInterfaceNameResolver(undefined)).to.not.exist;
        expect(defaultInterfaceNameResolver({ name: null, namespace: 'N' } as any)).to.not.exist;
        expect(defaultInterfaceNameResolver({ name: undefined, namespace: 'N' } as any)).to.not
            .exist;
        expect(defaultOutputNameResolver({ name: '', namespace: 'N' } as any)).to.not.exist;

        expect(defaultInterfaceNameResolver({ name: 'a', namespace: 'N' } as any)).to.equal('iA');
        expect(defaultInterfaceNameResolver({ name: 'A', namespace: 'N' } as any)).to.equal('iA');

        expect(defaultInterfaceNameResolver({ name: 'ab', namespace: 'N' } as any)).to.equal('iAb');
        expect(defaultInterfaceNameResolver({ name: 'Ab', namespace: 'N' } as any)).to.equal('iAb');

        expect(defaultInterfaceNameResolver({ name: 'abc', namespace: 'N' } as any)).to.equal(
            'iAbc',
        );
        expect(defaultInterfaceNameResolver({ name: 'Abc', namespace: 'N' } as any)).to.equal(
            'iAbc',
        );
    }).timeout(10000);

    it('defaultInputNameResolver', async () => {
        expect(defaultInputNameResolver(null)).to.not.exist;
        expect(defaultInputNameResolver(undefined)).to.not.exist;
        expect(defaultInputNameResolver({ name: null, namespace: 'N' } as any)).to.not.exist;
        expect(defaultInputNameResolver({ name: undefined, namespace: 'N' } as any)).to.not.exist;
        expect(defaultInputNameResolver({ name: '', namespace: 'N' } as any)).to.not.exist;

        expect(defaultInputNameResolver({ name: 'a', namespace: 'N' } as any)).to.equal('N_AInput');
        expect(defaultInputNameResolver({ name: 'A', namespace: 'N' } as any)).to.equal('N_AInput');

        expect(defaultInputNameResolver({ name: 'ab', namespace: 'N' } as any)).to.equal(
            'N_AbInput',
        );
        expect(defaultInputNameResolver({ name: 'Ab', namespace: 'N' } as any)).to.equal(
            'N_AbInput',
        );

        expect(defaultInputNameResolver({ name: 'abc', namespace: 'N' } as any)).to.equal(
            'N_AbcInput',
        );
        expect(defaultInputNameResolver({ name: 'Abc', namespace: 'N' } as any)).to.equal(
            'N_AbcInput',
        );
    }).timeout(10000);
});
