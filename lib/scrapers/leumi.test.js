"use strict";

require("core-js/modules/es.promise");

require("core-js/modules/es.string.trim");

var _leumi = _interopRequireDefault(require("./leumi"));

var _testsUtils = require("../tests/tests-utils");

var _definitions = require("../definitions");

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const COMPANY_ID = 'leumi'; // TODO this property should be hard-coded in the provider

const testsConfig = (0, _testsUtils.getTestsConfig)();
describe('Leumi legacy scraper', () => {
  beforeAll(() => {
    (0, _testsUtils.extendAsyncTimeout)(); // The default timeout is 5 seconds per async test, this function extends the timeout value
  });
  test('should expose login fields in scrapers constant', () => {
    expect(_definitions.SCRAPERS.leumi).toBeDefined();
    expect(_definitions.SCRAPERS.leumi.loginFields).toContain('username');
    expect(_definitions.SCRAPERS.leumi.loginFields).toContain('password');
  });
  (0, _testsUtils.maybeTestCompanyAPI)(COMPANY_ID, config => config.companyAPI.invalidPassword)('should fail on invalid user/password"', async () => {
    const options = _objectSpread({}, testsConfig.options, {
      companyId: COMPANY_ID
    });

    const scraper = new _leumi.default(options);
    const result = await scraper.scrape({
      username: 'e10s12',
      password: '3f3ss3d'
    });
    expect(result).toBeDefined();
    expect(result.success).toBeFalsy();
    expect(result.errorType).toBe(_baseScraperWithBrowser.LoginResults.InvalidPassword);
  });
  (0, _testsUtils.maybeTestCompanyAPI)(COMPANY_ID)('should scrape transactions"', async () => {
    const options = _objectSpread({}, testsConfig.options, {
      companyId: COMPANY_ID
    });

    const scraper = new _leumi.default(options);
    const result = await scraper.scrape(testsConfig.credentials.leumi);
    expect(result).toBeDefined();
    const error = `${result.errorType || ''} ${result.errorMessage || ''}`.trim();
    expect(error).toBe('');
    expect(result.success).toBeTruthy();
    (0, _testsUtils.exportTransactions)(COMPANY_ID, result.accounts || []);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy9sZXVtaS50ZXN0LnRzIl0sIm5hbWVzIjpbIkNPTVBBTllfSUQiLCJ0ZXN0c0NvbmZpZyIsImRlc2NyaWJlIiwiYmVmb3JlQWxsIiwidGVzdCIsImV4cGVjdCIsIlNDUkFQRVJTIiwibGV1bWkiLCJ0b0JlRGVmaW5lZCIsImxvZ2luRmllbGRzIiwidG9Db250YWluIiwiY29uZmlnIiwiY29tcGFueUFQSSIsImludmFsaWRQYXNzd29yZCIsIm9wdGlvbnMiLCJjb21wYW55SWQiLCJzY3JhcGVyIiwiTGV1bWlTY3JhcGVyIiwicmVzdWx0Iiwic2NyYXBlIiwidXNlcm5hbWUiLCJwYXNzd29yZCIsInN1Y2Nlc3MiLCJ0b0JlRmFsc3kiLCJlcnJvclR5cGUiLCJ0b0JlIiwiTG9naW5SZXN1bHRzIiwiSW52YWxpZFBhc3N3b3JkIiwiY3JlZGVudGlhbHMiLCJlcnJvciIsImVycm9yTWVzc2FnZSIsInRyaW0iLCJ0b0JlVHJ1dGh5IiwiYWNjb3VudHMiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztBQUNBOztBQUdBOztBQUNBOzs7Ozs7Ozs7O0FBRUEsTUFBTUEsVUFBVSxHQUFHLE9BQW5CLEMsQ0FBNEI7O0FBQzVCLE1BQU1DLFdBQVcsR0FBRyxpQ0FBcEI7QUFFQUMsUUFBUSxDQUFDLHNCQUFELEVBQXlCLE1BQU07QUFDckNDLEVBQUFBLFNBQVMsQ0FBQyxNQUFNO0FBQ2QsMENBRGMsQ0FDUTtBQUN2QixHQUZRLENBQVQ7QUFJQUMsRUFBQUEsSUFBSSxDQUFDLGlEQUFELEVBQW9ELE1BQU07QUFDNURDLElBQUFBLE1BQU0sQ0FBQ0Msc0JBQVNDLEtBQVYsQ0FBTixDQUF1QkMsV0FBdkI7QUFDQUgsSUFBQUEsTUFBTSxDQUFDQyxzQkFBU0MsS0FBVCxDQUFlRSxXQUFoQixDQUFOLENBQW1DQyxTQUFuQyxDQUE2QyxVQUE3QztBQUNBTCxJQUFBQSxNQUFNLENBQUNDLHNCQUFTQyxLQUFULENBQWVFLFdBQWhCLENBQU4sQ0FBbUNDLFNBQW5DLENBQTZDLFVBQTdDO0FBQ0QsR0FKRyxDQUFKO0FBTUEsdUNBQW9CVixVQUFwQixFQUFpQ1csTUFBRCxJQUFZQSxNQUFNLENBQUNDLFVBQVAsQ0FBa0JDLGVBQTlELEVBQStFLHVDQUEvRSxFQUF3SCxZQUFZO0FBQ2xJLFVBQU1DLE9BQU8scUJBQ1JiLFdBQVcsQ0FBQ2EsT0FESjtBQUVYQyxNQUFBQSxTQUFTLEVBQUVmO0FBRkEsTUFBYjs7QUFLQSxVQUFNZ0IsT0FBTyxHQUFHLElBQUlDLGNBQUosQ0FBaUJILE9BQWpCLENBQWhCO0FBRUEsVUFBTUksTUFBTSxHQUFHLE1BQU1GLE9BQU8sQ0FBQ0csTUFBUixDQUFlO0FBQUVDLE1BQUFBLFFBQVEsRUFBRSxRQUFaO0FBQXNCQyxNQUFBQSxRQUFRLEVBQUU7QUFBaEMsS0FBZixDQUFyQjtBQUVBaEIsSUFBQUEsTUFBTSxDQUFDYSxNQUFELENBQU4sQ0FBZVYsV0FBZjtBQUNBSCxJQUFBQSxNQUFNLENBQUNhLE1BQU0sQ0FBQ0ksT0FBUixDQUFOLENBQXVCQyxTQUF2QjtBQUNBbEIsSUFBQUEsTUFBTSxDQUFDYSxNQUFNLENBQUNNLFNBQVIsQ0FBTixDQUF5QkMsSUFBekIsQ0FBOEJDLHFDQUFhQyxlQUEzQztBQUNELEdBYkQ7QUFlQSx1Q0FBb0IzQixVQUFwQixFQUFnQyw2QkFBaEMsRUFBK0QsWUFBWTtBQUN6RSxVQUFNYyxPQUFPLHFCQUNSYixXQUFXLENBQUNhLE9BREo7QUFFWEMsTUFBQUEsU0FBUyxFQUFFZjtBQUZBLE1BQWI7O0FBS0EsVUFBTWdCLE9BQU8sR0FBRyxJQUFJQyxjQUFKLENBQWlCSCxPQUFqQixDQUFoQjtBQUNBLFVBQU1JLE1BQU0sR0FBRyxNQUFNRixPQUFPLENBQUNHLE1BQVIsQ0FBZWxCLFdBQVcsQ0FBQzJCLFdBQVosQ0FBd0JyQixLQUF2QyxDQUFyQjtBQUNBRixJQUFBQSxNQUFNLENBQUNhLE1BQUQsQ0FBTixDQUFlVixXQUFmO0FBQ0EsVUFBTXFCLEtBQUssR0FBSSxHQUFFWCxNQUFNLENBQUNNLFNBQVAsSUFBb0IsRUFBRyxJQUFHTixNQUFNLENBQUNZLFlBQVAsSUFBdUIsRUFBRyxFQUF2RCxDQUF5REMsSUFBekQsRUFBZDtBQUNBMUIsSUFBQUEsTUFBTSxDQUFDd0IsS0FBRCxDQUFOLENBQWNKLElBQWQsQ0FBbUIsRUFBbkI7QUFDQXBCLElBQUFBLE1BQU0sQ0FBQ2EsTUFBTSxDQUFDSSxPQUFSLENBQU4sQ0FBdUJVLFVBQXZCO0FBRUEsd0NBQW1CaEMsVUFBbkIsRUFBK0JrQixNQUFNLENBQUNlLFFBQVAsSUFBbUIsRUFBbEQ7QUFDRCxHQWREO0FBZUQsQ0F6Q08sQ0FBUiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBMZXVtaVNjcmFwZXIgZnJvbSAnLi9sZXVtaSc7XG5pbXBvcnQge1xuICBtYXliZVRlc3RDb21wYW55QVBJLCBleHRlbmRBc3luY1RpbWVvdXQsIGdldFRlc3RzQ29uZmlnLCBleHBvcnRUcmFuc2FjdGlvbnMsXG59IGZyb20gJy4uL3Rlc3RzL3Rlc3RzLXV0aWxzJztcbmltcG9ydCB7IFNDUkFQRVJTIH0gZnJvbSAnLi4vZGVmaW5pdGlvbnMnO1xuaW1wb3J0IHsgTG9naW5SZXN1bHRzIH0gZnJvbSAnLi9iYXNlLXNjcmFwZXItd2l0aC1icm93c2VyJztcblxuY29uc3QgQ09NUEFOWV9JRCA9ICdsZXVtaSc7IC8vIFRPRE8gdGhpcyBwcm9wZXJ0eSBzaG91bGQgYmUgaGFyZC1jb2RlZCBpbiB0aGUgcHJvdmlkZXJcbmNvbnN0IHRlc3RzQ29uZmlnID0gZ2V0VGVzdHNDb25maWcoKTtcblxuZGVzY3JpYmUoJ0xldW1pIGxlZ2FjeSBzY3JhcGVyJywgKCkgPT4ge1xuICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgIGV4dGVuZEFzeW5jVGltZW91dCgpOyAvLyBUaGUgZGVmYXVsdCB0aW1lb3V0IGlzIDUgc2Vjb25kcyBwZXIgYXN5bmMgdGVzdCwgdGhpcyBmdW5jdGlvbiBleHRlbmRzIHRoZSB0aW1lb3V0IHZhbHVlXG4gIH0pO1xuXG4gIHRlc3QoJ3Nob3VsZCBleHBvc2UgbG9naW4gZmllbGRzIGluIHNjcmFwZXJzIGNvbnN0YW50JywgKCkgPT4ge1xuICAgIGV4cGVjdChTQ1JBUEVSUy5sZXVtaSkudG9CZURlZmluZWQoKTtcbiAgICBleHBlY3QoU0NSQVBFUlMubGV1bWkubG9naW5GaWVsZHMpLnRvQ29udGFpbigndXNlcm5hbWUnKTtcbiAgICBleHBlY3QoU0NSQVBFUlMubGV1bWkubG9naW5GaWVsZHMpLnRvQ29udGFpbigncGFzc3dvcmQnKTtcbiAgfSk7XG5cbiAgbWF5YmVUZXN0Q29tcGFueUFQSShDT01QQU5ZX0lELCAoY29uZmlnKSA9PiBjb25maWcuY29tcGFueUFQSS5pbnZhbGlkUGFzc3dvcmQpKCdzaG91bGQgZmFpbCBvbiBpbnZhbGlkIHVzZXIvcGFzc3dvcmRcIicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4udGVzdHNDb25maWcub3B0aW9ucyxcbiAgICAgIGNvbXBhbnlJZDogQ09NUEFOWV9JRCxcbiAgICB9O1xuXG4gICAgY29uc3Qgc2NyYXBlciA9IG5ldyBMZXVtaVNjcmFwZXIob3B0aW9ucyk7XG5cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzY3JhcGVyLnNjcmFwZSh7IHVzZXJuYW1lOiAnZTEwczEyJywgcGFzc3dvcmQ6ICczZjNzczNkJyB9KTtcblxuICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlRmFsc3koKTtcbiAgICBleHBlY3QocmVzdWx0LmVycm9yVHlwZSkudG9CZShMb2dpblJlc3VsdHMuSW52YWxpZFBhc3N3b3JkKTtcbiAgfSk7XG5cbiAgbWF5YmVUZXN0Q29tcGFueUFQSShDT01QQU5ZX0lEKSgnc2hvdWxkIHNjcmFwZSB0cmFuc2FjdGlvbnNcIicsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgLi4udGVzdHNDb25maWcub3B0aW9ucyxcbiAgICAgIGNvbXBhbnlJZDogQ09NUEFOWV9JRCxcbiAgICB9O1xuXG4gICAgY29uc3Qgc2NyYXBlciA9IG5ldyBMZXVtaVNjcmFwZXIob3B0aW9ucyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NyYXBlci5zY3JhcGUodGVzdHNDb25maWcuY3JlZGVudGlhbHMubGV1bWkpO1xuICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XG4gICAgY29uc3QgZXJyb3IgPSBgJHtyZXN1bHQuZXJyb3JUeXBlIHx8ICcnfSAke3Jlc3VsdC5lcnJvck1lc3NhZ2UgfHwgJyd9YC50cmltKCk7XG4gICAgZXhwZWN0KGVycm9yKS50b0JlKCcnKTtcbiAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmVUcnV0aHkoKTtcblxuICAgIGV4cG9ydFRyYW5zYWN0aW9ucyhDT01QQU5ZX0lELCByZXN1bHQuYWNjb3VudHMgfHwgW10pO1xuICB9KTtcbn0pO1xuIl19