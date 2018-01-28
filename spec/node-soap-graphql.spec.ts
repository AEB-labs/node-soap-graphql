import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, fail, it, xit } from 'mocha';
import { soapGraphqlSchema } from '../src/soap-graphql';
import { GraphQLSchema } from 'graphql/type/schema';
import { introspectionQuery } from 'graphql/utilities/introspectionQuery';
import { graphql, printSchema } from 'graphql';
import { inspect } from 'util';

chai.use(chaiAsPromised);

describe('call soap endpoints', () => {

    async function callEndpoint(url: string): Promise<GraphQLSchema> {

        const schema: GraphQLSchema = await soapGraphqlSchema(url);

        expect(await graphql(schema, introspectionQuery)).to.exist;

        const errorRes = await graphql(schema, `
            mutation {
                foo {
                    bar
                }
            }
        `);
        // console.log('errorRes', errorRes);
        expect(errorRes).to.exist;
        expect(errorRes.data).to.not.exist;
        expect(errorRes.errors).to.exist;

        return schema;
    }

    async function queryEndpoint(url: string, query: string) {

        const schema: GraphQLSchema = await callEndpoint(url);

        const res: any = await graphql(schema, query);
        // console.log('res', res);
        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors).to.not.exist;
    }

    it('http://www.webservicex.net/geoipservice.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/geoipservice.asmx?WSDL', `
        mutation {
            GetGeoIP(IPAddress: "74.125.224.72") {
                IP
            }
        }
        `);
    }).timeout(5000);

    // @todo
    xit('http://www.webservicex.net/CurrencyConvertor.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/CurrencyConvertor.asmx?WSDL', `
            mutation {
                ConversionRate(FromCurrency: "AFA", ToCurrency: "ALL")
            }
        `);
    }).timeout(5000);

    // @todo
    xit('http://www.webservicex.net/globalweather.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/globalweather.asmx?WSDL', `
            mutation {
                GetCitiesByCountry(CountryName: 'Germany')
                GetWeather(CityName: 'Wiesbaden', CountryName: 'Germany')
            }
        `);
    }).timeout(5000);

});
