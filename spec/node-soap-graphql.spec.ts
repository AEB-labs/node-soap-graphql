import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { describe, it, xit } from 'mocha';
import { GraphQLSchema } from 'graphql/type/schema';
import { getIntrospectionQuery, graphql } from 'graphql';
import { SoapGraphqlOptions, soapGraphqlSchema } from '../index';

chai.use(chaiAsPromised);

describe('call soap endpoints', () => {
    it('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL', async () => {
        await queryEndpoint(
            {
                createClient: {
                    url: 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
                },
            },
            `
            fragment CountryInfo on OorsprongOrgWebsamplesCountryinfo_TCountryInfo {
                sName
                sCurrencyISOCode
                Languages {
                    tLanguage {
                        sISOCode
                        sName
                    }
                }
            }

            mutation {
                FullCountryInfo(sCountryISOCode: "PL") {
                    FullCountryInfoResult {
                        ...CountryInfo
                    }
                }
            }
            `,
            (data) => {
                expect(data.FullCountryInfo.FullCountryInfoResult).to.exist;
                expect(data.FullCountryInfo.FullCountryInfoResult.sName).to.equal('Poland');
                expect(data.FullCountryInfo.FullCountryInfoResult.sCurrencyISOCode).to.equal('PLN');
                expect(data.FullCountryInfo.FullCountryInfoResult.Languages).to.exist;
                expect(data.FullCountryInfo.FullCountryInfoResult.Languages.tLanguage).to.exist;
                expect(data.FullCountryInfo.FullCountryInfoResult.Languages.tLanguage[0]).to.exist;
            },
        );
    }).timeout(5000);

    it('http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL', async () => {
        await queryEndpoint(
            {
                createClient: {
                    url: 'http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL',
                },
            },
            `
            mutation {
                NumberToWords(ubiNum: 1234) {
                    NumberToWordsResult
                }
            }
            `,
            (data) => {
                expect(data.NumberToWords).to.exist;
                expect(data.NumberToWords.NumberToWordsResult).to.equal(
                    'one thousand two hundred and thirty four',
                );
            },
        );
    }).timeout(5000);

    async function callEndpoint(options: SoapGraphqlOptions): Promise<GraphQLSchema> {
        const schema: GraphQLSchema = await soapGraphqlSchema(options);
        // console.log(`schema`, printSchema(schema));

        // check that intorspection can be executed
        const introspection = await graphql({ schema, source: getIntrospectionQuery() });
        // console.log(`introspection`, introspection);
        expect(introspection).to.exist;

        // check the description field
        const description = await graphql({
            schema,
            source: `
                {
                    description
                }
            `,
        });
        // console.log(`description`, description);
        expect(description).to.exist;

        const errorRes = await graphql({
            schema,
            source: `
                mutation {
                    foo {
                        bar
                    }
                }
            `,
        });
        // console.log(`error'`, errorRes);
        expect(errorRes).to.exist;
        expect(errorRes.data).to.not.exist;
        expect(errorRes.errors).to.exist;

        return schema;
    }

    async function queryEndpoint(
        options: SoapGraphqlOptions,
        query: string,
        check?: (data: any) => void,
    ) {
        const schema: GraphQLSchema = await callEndpoint(options);

        const res: any = await graphql({ schema, source: query });
        // console.log(`result`, res);
        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors).to.not.exist;
        if (!!check) {
            check(res.data);
        }
    }
});
