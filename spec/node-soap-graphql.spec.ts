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

        const schema: GraphQLSchema = await soapGraphqlSchema({
            createClient: { url: url }, debug: false, warnings: true,
        });
        // console.log(`schema of '${url}'`, printSchema(schema));

        expect(await graphql(schema, introspectionQuery)).to.exist;

        const errorRes = await graphql(schema, `
            mutation {
                foo {
                    bar
                }
            }
        `);
        // console.log(`error of '${url}'`, errorRes);
        expect(errorRes).to.exist;
        expect(errorRes.data).to.not.exist;
        expect(errorRes.errors).to.exist;

        return schema;
    }

    async function queryEndpoint(url: string, query: string, check?: (data: any) => void) {

        const schema: GraphQLSchema = await callEndpoint(url);

        const res: any = await graphql(schema, query);
        // console.log(`result of '${url}'`, res);
        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors).to.not.exist;
        if (!!check) {
            check(res.data);
        }
    }

    it('http://www.webservicex.net/geoipservice.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/geoipservice.asmx?WSDL', `
        mutation {
            GetGeoIP(IPAddress: "74.125.224.72") {
                IP
                ReturnCode
            }
        }
        `, (data) => {
                expect(data.GetGeoIP.IP).to.exist;
                expect(data.GetGeoIP.IP).to.equal('74.125.224.72');
                expect(data.GetGeoIP.ReturnCode).to.exist;
                expect(data.GetGeoIP.ReturnCode).to.equal(1);
            });
    }).timeout(5000);

    it('http://ws.cdyne.com/ip2geo/ip2geo.asmx?wsdl', async () => {
        await queryEndpoint('http://ws.cdyne.com/ip2geo/ip2geo.asmx?wsdl', `
        mutation {
            ResolveIP(ipAddress: "74.125.224.72", licenseKey: "") {
              Latitude
              Longitude
              AreaCode
            }
        }
        `, (data) => {
                expect(data.ResolveIP).to.exist;
                expect(data.ResolveIP.Latitude).to.exist;
                expect(data.ResolveIP.Longitude).to.exist;
                expect(data.ResolveIP.AreaCode).to.exist;
            });
    }).timeout(5000);

    // @todo resolve type CurrencyName
    it('http://www.webservicex.net/CurrencyConvertor.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/CurrencyConvertor.asmx?WSDL', `
            mutation {
                ConversionRate(FromCurrency: "AFA", ToCurrency: "ALL")
            }
        `);
    }).timeout(5000);

    it('http://www.webservicex.net/globalweather.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/globalweather.asmx?WSDL', `
            mutation {
                GetCitiesByCountry(CountryName: "Germany")
            }
        `, (data) => {
                expect(data.GetCitiesByCountry).to.exist;
                expect(data.GetCitiesByCountry).to.include('<City>Wunstorf</City>');
            });
    }).timeout(5000);

    it('http://www.webservicex.net/periodictable.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/periodictable.asmx?WSDL', `
            mutation {
                atoms: GetAtoms
                atoms2: GetAtoms
            }
            `, (data) => {
                expect(data.atoms).to.exist;
                expect(data.atoms2).to.exist;
                expect(data.atoms).to.include('<ElementName>Aluminium</ElementName>');
                expect(data.atoms2).to.include('<ElementName>Aluminium</ElementName>');
            });
    }).timeout(5000);

    // @todo resolve type Astronomical
    it('http://www.webservicex.net/Astronomical.asmx?WSDL', async () => {
        await queryEndpoint('http://www.webservicex.net/Astronomical.asmx?WSDL', `
            mutation {
                ChangeAstronomicalUnit(AstronomicalValue: 1.24, fromAstronomicalUnit: "lightyear", toAstronomicalUnit: "parsec")
            }
            `, (data) => {
                expect(data.ChangeAstronomicalUnit).to.exist;
                expect(data.ChangeAstronomicalUnit).to.equal(0.3801865856585023);
            });
    }).timeout(5000);

    // @todo
    it('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL', async () => {
        await queryEndpoint('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL', `
            fragment CountryInfo on TCountryInfo {
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
                    ...CountryInfo
                }
            }
            `, (data) => {
                expect(data.FullCountryInfo).to.exist;
                expect(data.FullCountryInfo.sName).to.equal('Poland');
                expect(data.FullCountryInfo.sCurrencyISOCode).to.equal('PLN');
                expect(data.FullCountryInfo.Languages).to.exist;
                expect(data.FullCountryInfo.Languages.tLanguage).to.exist;
                expect(data.FullCountryInfo.Languages.tLanguage[0]).to.exist;
            });
    }).timeout(5000);

    // @todo
    xit('http://soatest.parasoft.com/calculator.wsdl', async () => {
        await queryEndpoint('http://soatest.parasoft.com/calculator.wsdl', `
            mutation {
                sum1: add(x: 1, y: 2)
                sum2: add(x: 2.3, y: 3.45)
                divide(numerator: 2, denominator: 4)
            }
            `, (data) => {
                expect(data.sum1).to.exist;
                expect(data.sum1).to.equal(3);
                expect(data.sum2).to.exist;
                expect(data.sum2).to.equal(5.75);
                expect(data.divide).to.exist;
                expect(data.divide).to.equal(0.5);
            });
    }).timeout(5000);

});
