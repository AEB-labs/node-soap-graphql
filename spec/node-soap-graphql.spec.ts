import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { after, afterEach, before, beforeEach, describe, fail, it, xit } from 'mocha';
import { GraphQLSchema } from 'graphql/type/schema';
import { introspectionQuery } from 'graphql/utilities/introspectionQuery';
import { graphql, printSchema, GraphQLInputType, GraphQLEnumType, GraphQLEnumValueConfigMap } from 'graphql';
import { inspect } from 'util';
import { GraphQLBoolean } from 'graphql/type/scalars';
import { soapGraphqlSchema, SoapCallInput, CustomTypeResolver, DefaultTypeResolver, SoapGraphqlOptions, NodeSoapClient, SoapCaller, NodeSoapCaller, createSoapClient, createLogger } from '../index';

chai.use(chaiAsPromised);

describe('call soap endpoints', () => {

    it('http://www.webservicex.net/geoipservice.asmx?WSDL', async () => {
        await queryEndpoint({ createClient: { url: 'http://www.webservicex.net/geoipservice.asmx?WSDL' } }, `
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
        await queryEndpoint({ createClient: { url: 'http://ws.cdyne.com/ip2geo/ip2geo.asmx?wsdl' } }, `
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

    it('http://www.webservicex.net/globalweather.asmx?WSDL', async () => {
        await queryEndpoint({ createClient: { url: 'http://www.webservicex.net/globalweather.asmx?WSDL' } }, `
            mutation {
                GetCitiesByCountry(CountryName: "Germany")
            }
        `, (data) => {
                expect(data.GetCitiesByCountry).to.exist;
                expect(data.GetCitiesByCountry).to.include('<City>Wunstorf</City>');
            });
    }).timeout(5000);

    it('http://www.webservicex.net/periodictable.asmx?WSDL', async () => {
        await queryEndpoint({ createClient: { url: 'http://www.webservicex.net/periodictable.asmx?WSDL' } }, `
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

    it('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL', async () => {
        await queryEndpoint({ createClient: { url: 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL' } }, `
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

    it('http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL', async () => {
        await queryEndpoint({ createClient: { url: 'http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL' } }, `
            mutation {
                NumberToWords(ubiNum: 1234)
            }
            `, (data) => {
                expect(data.NumberToWords).to.exist;
                expect(data.NumberToWords).to.equal('one thousand two hundred and thirty four');
            });
    }).timeout(5000);

    it('http://www.webservicex.net/Astronomical.asmx?WSDL', async () => {

        class AstronomicalResolver extends DefaultTypeResolver {

            inputType(typeName: string): GraphQLInputType {
                if (typeName === 'string|meters,kilometers,miles,AstronmicalunitAU,lightyear,parsec') {
                    return new GraphQLEnumType({
                        name: 'AstronomicalUnit',
                        values: {
                            'meters': {},
                            'kilometers': {},
                            'miles': {},
                            'AstronmicalunitAU': {},
                            'lightyear': {},
                            'parsec': {},
                        }
                    })
                }
                return super.inputType(typeName);
            }

        }

        await queryEndpoint({
            createClient: { url: 'http://www.webservicex.net/Astronomical.asmx?WSDL' },
            schemaOptions: { customResolver: new AstronomicalResolver() }
        }, `
            mutation {
                ChangeAstronomicalUnit(AstronomicalValue: 1.24, fromAstronomicalUnit: lightyear, toAstronomicalUnit: parsec)
            }
            `, (data) => {
                expect(data.ChangeAstronomicalUnit).to.exist;
                expect(data.ChangeAstronomicalUnit).to.equal(0.3801865856585023);
            });
    }).timeout(5000);

    it('http://www.webservicex.net/CurrencyConvertor.asmx?WSDL', async () => {

        class CurrencyResolver extends DefaultTypeResolver {

            inputType(typeName: string): GraphQLInputType {
                if (!!typeName && typeName.startsWith('string|AFA,ALL,DZD,ARS,AWG,AUD,BSD,BHD,BDT,BBD')) {
                    const values: GraphQLEnumValueConfigMap = {};
                    typeName.substring(7).split(',').forEach((currencyCode: string) => {
                        values[currencyCode] = {};
                    })

                    return new GraphQLEnumType({
                        name: 'Currency',
                        values: values
                    })
                }
                return super.inputType(typeName);
            }

        }

        await queryEndpoint({
            createClient: { url: 'http://www.webservicex.net/CurrencyConvertor.asmx?WSDL' },
            schemaOptions: { customResolver: new CurrencyResolver() }
        }, `
            mutation {
                ConversionRate(FromCurrency: AFA, ToCurrency: ALL)
            }
        `);
    }).timeout(5000);

    it('http://soatest.parasoft.com/calculator.wsdl', async () => {

        class CalculatorCaller extends NodeSoapCaller {
            async createGraphqlResult(input: SoapCallInput, result: any): Promise<any> {
                return result['Result']['$value'];
            }
        }

        const soapClient: NodeSoapClient = await createSoapClient('http://soatest.parasoft.com/calculator.wsdl');
        const caller: SoapCaller = new CalculatorCaller(soapClient, createLogger(false, false));
        const options: SoapGraphqlOptions = {
            soapClient: soapClient,
            soapCaller: caller,
            debug: false,
        };

        await queryEndpoint(options, `
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

    async function callEndpoint(options: SoapGraphqlOptions): Promise<GraphQLSchema> {

        const schema: GraphQLSchema = await soapGraphqlSchema(options);
        // console.log(`schema`, printSchema(schema));

        // check that intorspection can be executed
        const introspection = await graphql(schema, introspectionQuery);
        // console.log(`introspection`, introspection);
        expect(introspection).to.exist;

        // check the description field
        const description = await graphql(schema, `
            {
                description
            }
        `);
        // console.log(`description`, description);
        expect(description).to.exist;

        const errorRes = await graphql(schema, `
            mutation {
                foo {
                    bar
                }
            }
        `);
        // console.log(`error'`, errorRes);
        expect(errorRes).to.exist;
        expect(errorRes.data).to.not.exist;
        expect(errorRes.errors).to.exist;

        return schema;
    }

    async function queryEndpoint(options: SoapGraphqlOptions, query: string, check?: (data: any) => void) {

        const schema: GraphQLSchema = await callEndpoint(options);

        const res: any = await graphql(schema, query);
        // console.log(`result`, res);
        expect(res).to.exist;
        expect(res.data).to.exist;
        expect(res.errors).to.not.exist;
        if (!!check) {
            check(res.data);
        }
    }

});
