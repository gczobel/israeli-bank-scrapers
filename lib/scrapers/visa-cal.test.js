"use strict";

require("core-js/modules/es.promise");

require("core-js/modules/es.string.trim");

var _visaCal = _interopRequireDefault(require("./visa-cal"));

var _testsUtils = require("../tests/tests-utils");

var _definitions = require("../definitions");

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const COMPANY_ID = 'visaCal'; // TODO this property should be hard-coded in the provider

const testsConfig = (0, _testsUtils.getTestsConfig)();
describe('VisaCal legacy scraper', () => {
  beforeAll(() => {
    (0, _testsUtils.extendAsyncTimeout)(); // The default timeout is 5 seconds per async test, this function extends the timeout value
  });
  test('should expose login fields in scrapers constant', () => {
    expect(_definitions.SCRAPERS.visaCal).toBeDefined();
    expect(_definitions.SCRAPERS.visaCal.loginFields).toContain('username');
    expect(_definitions.SCRAPERS.visaCal.loginFields).toContain('password');
  });
  (0, _testsUtils.maybeTestCompanyAPI)(COMPANY_ID, config => config.companyAPI.invalidPassword)('should fail on invalid user/password"', async () => {
    const options = _objectSpread({}, testsConfig.options, {
      companyId: COMPANY_ID
    });

    const scraper = new _visaCal.default(options);
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

    const scraper = new _visaCal.default(options);
    const result = await scraper.scrape(testsConfig.credentials.visaCal);
    expect(result).toBeDefined();
    const error = `${result.errorType || ''} ${result.errorMessage || ''}`.trim();
    expect(error).toBe('');
    expect(result.success).toBeTruthy();
    (0, _testsUtils.exportTransactions)(COMPANY_ID, result.accounts || []);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy92aXNhLWNhbC50ZXN0LnRzIl0sIm5hbWVzIjpbIkNPTVBBTllfSUQiLCJ0ZXN0c0NvbmZpZyIsImRlc2NyaWJlIiwiYmVmb3JlQWxsIiwidGVzdCIsImV4cGVjdCIsIlNDUkFQRVJTIiwidmlzYUNhbCIsInRvQmVEZWZpbmVkIiwibG9naW5GaWVsZHMiLCJ0b0NvbnRhaW4iLCJjb25maWciLCJjb21wYW55QVBJIiwiaW52YWxpZFBhc3N3b3JkIiwib3B0aW9ucyIsImNvbXBhbnlJZCIsInNjcmFwZXIiLCJWaXNhQ2FsU2NyYXBlciIsInJlc3VsdCIsInNjcmFwZSIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJzdWNjZXNzIiwidG9CZUZhbHN5IiwiZXJyb3JUeXBlIiwidG9CZSIsIkxvZ2luUmVzdWx0cyIsIkludmFsaWRQYXNzd29yZCIsImNyZWRlbnRpYWxzIiwiZXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJ0cmltIiwidG9CZVRydXRoeSIsImFjY291bnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFDQTs7QUFHQTs7QUFDQTs7Ozs7Ozs7OztBQUVBLE1BQU1BLFVBQVUsR0FBRyxTQUFuQixDLENBQThCOztBQUM5QixNQUFNQyxXQUFXLEdBQUcsaUNBQXBCO0FBRUFDLFFBQVEsQ0FBQyx3QkFBRCxFQUEyQixNQUFNO0FBQ3ZDQyxFQUFBQSxTQUFTLENBQUMsTUFBTTtBQUNkLDBDQURjLENBQ1E7QUFDdkIsR0FGUSxDQUFUO0FBSUFDLEVBQUFBLElBQUksQ0FBQyxpREFBRCxFQUFvRCxNQUFNO0FBQzVEQyxJQUFBQSxNQUFNLENBQUNDLHNCQUFTQyxPQUFWLENBQU4sQ0FBeUJDLFdBQXpCO0FBQ0FILElBQUFBLE1BQU0sQ0FBQ0Msc0JBQVNDLE9BQVQsQ0FBaUJFLFdBQWxCLENBQU4sQ0FBcUNDLFNBQXJDLENBQStDLFVBQS9DO0FBQ0FMLElBQUFBLE1BQU0sQ0FBQ0Msc0JBQVNDLE9BQVQsQ0FBaUJFLFdBQWxCLENBQU4sQ0FBcUNDLFNBQXJDLENBQStDLFVBQS9DO0FBQ0QsR0FKRyxDQUFKO0FBTUEsdUNBQW9CVixVQUFwQixFQUFpQ1csTUFBRCxJQUFZQSxNQUFNLENBQUNDLFVBQVAsQ0FBa0JDLGVBQTlELEVBQStFLHVDQUEvRSxFQUF3SCxZQUFZO0FBQ2xJLFVBQU1DLE9BQU8scUJBQ1JiLFdBQVcsQ0FBQ2EsT0FESjtBQUVYQyxNQUFBQSxTQUFTLEVBQUVmO0FBRkEsTUFBYjs7QUFLQSxVQUFNZ0IsT0FBTyxHQUFHLElBQUlDLGdCQUFKLENBQW1CSCxPQUFuQixDQUFoQjtBQUVBLFVBQU1JLE1BQU0sR0FBRyxNQUFNRixPQUFPLENBQUNHLE1BQVIsQ0FBZTtBQUFFQyxNQUFBQSxRQUFRLEVBQUUsUUFBWjtBQUFzQkMsTUFBQUEsUUFBUSxFQUFFO0FBQWhDLEtBQWYsQ0FBckI7QUFFQWhCLElBQUFBLE1BQU0sQ0FBQ2EsTUFBRCxDQUFOLENBQWVWLFdBQWY7QUFDQUgsSUFBQUEsTUFBTSxDQUFDYSxNQUFNLENBQUNJLE9BQVIsQ0FBTixDQUF1QkMsU0FBdkI7QUFDQWxCLElBQUFBLE1BQU0sQ0FBQ2EsTUFBTSxDQUFDTSxTQUFSLENBQU4sQ0FBeUJDLElBQXpCLENBQThCQyxxQ0FBYUMsZUFBM0M7QUFDRCxHQWJEO0FBZUEsdUNBQW9CM0IsVUFBcEIsRUFBZ0MsNkJBQWhDLEVBQStELFlBQVk7QUFDekUsVUFBTWMsT0FBTyxxQkFDUmIsV0FBVyxDQUFDYSxPQURKO0FBRVhDLE1BQUFBLFNBQVMsRUFBRWY7QUFGQSxNQUFiOztBQUtBLFVBQU1nQixPQUFPLEdBQUcsSUFBSUMsZ0JBQUosQ0FBbUJILE9BQW5CLENBQWhCO0FBQ0EsVUFBTUksTUFBTSxHQUFHLE1BQU1GLE9BQU8sQ0FBQ0csTUFBUixDQUFlbEIsV0FBVyxDQUFDMkIsV0FBWixDQUF3QnJCLE9BQXZDLENBQXJCO0FBQ0FGLElBQUFBLE1BQU0sQ0FBQ2EsTUFBRCxDQUFOLENBQWVWLFdBQWY7QUFDQSxVQUFNcUIsS0FBSyxHQUFJLEdBQUVYLE1BQU0sQ0FBQ00sU0FBUCxJQUFvQixFQUFHLElBQUdOLE1BQU0sQ0FBQ1ksWUFBUCxJQUF1QixFQUFHLEVBQXZELENBQXlEQyxJQUF6RCxFQUFkO0FBQ0ExQixJQUFBQSxNQUFNLENBQUN3QixLQUFELENBQU4sQ0FBY0osSUFBZCxDQUFtQixFQUFuQjtBQUNBcEIsSUFBQUEsTUFBTSxDQUFDYSxNQUFNLENBQUNJLE9BQVIsQ0FBTixDQUF1QlUsVUFBdkI7QUFFQSx3Q0FBbUJoQyxVQUFuQixFQUErQmtCLE1BQU0sQ0FBQ2UsUUFBUCxJQUFtQixFQUFsRDtBQUNELEdBZEQ7QUFlRCxDQXpDTyxDQUFSIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFZpc2FDYWxTY3JhcGVyIGZyb20gJy4vdmlzYS1jYWwnO1xuaW1wb3J0IHtcbiAgbWF5YmVUZXN0Q29tcGFueUFQSSwgZXh0ZW5kQXN5bmNUaW1lb3V0LCBnZXRUZXN0c0NvbmZpZywgZXhwb3J0VHJhbnNhY3Rpb25zLFxufSBmcm9tICcuLi90ZXN0cy90ZXN0cy11dGlscyc7XG5pbXBvcnQgeyBTQ1JBUEVSUyB9IGZyb20gJy4uL2RlZmluaXRpb25zJztcbmltcG9ydCB7IExvZ2luUmVzdWx0cyB9IGZyb20gJy4vYmFzZS1zY3JhcGVyLXdpdGgtYnJvd3Nlcic7XG5cbmNvbnN0IENPTVBBTllfSUQgPSAndmlzYUNhbCc7IC8vIFRPRE8gdGhpcyBwcm9wZXJ0eSBzaG91bGQgYmUgaGFyZC1jb2RlZCBpbiB0aGUgcHJvdmlkZXJcbmNvbnN0IHRlc3RzQ29uZmlnID0gZ2V0VGVzdHNDb25maWcoKTtcblxuZGVzY3JpYmUoJ1Zpc2FDYWwgbGVnYWN5IHNjcmFwZXInLCAoKSA9PiB7XG4gIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgZXh0ZW5kQXN5bmNUaW1lb3V0KCk7IC8vIFRoZSBkZWZhdWx0IHRpbWVvdXQgaXMgNSBzZWNvbmRzIHBlciBhc3luYyB0ZXN0LCB0aGlzIGZ1bmN0aW9uIGV4dGVuZHMgdGhlIHRpbWVvdXQgdmFsdWVcbiAgfSk7XG5cbiAgdGVzdCgnc2hvdWxkIGV4cG9zZSBsb2dpbiBmaWVsZHMgaW4gc2NyYXBlcnMgY29uc3RhbnQnLCAoKSA9PiB7XG4gICAgZXhwZWN0KFNDUkFQRVJTLnZpc2FDYWwpLnRvQmVEZWZpbmVkKCk7XG4gICAgZXhwZWN0KFNDUkFQRVJTLnZpc2FDYWwubG9naW5GaWVsZHMpLnRvQ29udGFpbigndXNlcm5hbWUnKTtcbiAgICBleHBlY3QoU0NSQVBFUlMudmlzYUNhbC5sb2dpbkZpZWxkcykudG9Db250YWluKCdwYXNzd29yZCcpO1xuICB9KTtcblxuICBtYXliZVRlc3RDb21wYW55QVBJKENPTVBBTllfSUQsIChjb25maWcpID0+IGNvbmZpZy5jb21wYW55QVBJLmludmFsaWRQYXNzd29yZCkoJ3Nob3VsZCBmYWlsIG9uIGludmFsaWQgdXNlci9wYXNzd29yZFwiJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi50ZXN0c0NvbmZpZy5vcHRpb25zLFxuICAgICAgY29tcGFueUlkOiBDT01QQU5ZX0lELFxuICAgIH07XG5cbiAgICBjb25zdCBzY3JhcGVyID0gbmV3IFZpc2FDYWxTY3JhcGVyKG9wdGlvbnMpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NyYXBlci5zY3JhcGUoeyB1c2VybmFtZTogJ2UxMHMxMicsIHBhc3N3b3JkOiAnM2Yzc3MzZCcgfSk7XG5cbiAgICBleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xuICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZUZhbHN5KCk7XG4gICAgZXhwZWN0KHJlc3VsdC5lcnJvclR5cGUpLnRvQmUoTG9naW5SZXN1bHRzLkludmFsaWRQYXNzd29yZCk7XG4gIH0pO1xuXG4gIG1heWJlVGVzdENvbXBhbnlBUEkoQ09NUEFOWV9JRCkoJ3Nob3VsZCBzY3JhcGUgdHJhbnNhY3Rpb25zXCInLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLnRlc3RzQ29uZmlnLm9wdGlvbnMsXG4gICAgICBjb21wYW55SWQ6IENPTVBBTllfSUQsXG4gICAgfTtcblxuICAgIGNvbnN0IHNjcmFwZXIgPSBuZXcgVmlzYUNhbFNjcmFwZXIob3B0aW9ucyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NyYXBlci5zY3JhcGUodGVzdHNDb25maWcuY3JlZGVudGlhbHMudmlzYUNhbCk7XG4gICAgZXhwZWN0KHJlc3VsdCkudG9CZURlZmluZWQoKTtcbiAgICBjb25zdCBlcnJvciA9IGAke3Jlc3VsdC5lcnJvclR5cGUgfHwgJyd9ICR7cmVzdWx0LmVycm9yTWVzc2FnZSB8fCAnJ31gLnRyaW0oKTtcbiAgICBleHBlY3QoZXJyb3IpLnRvQmUoJycpO1xuICAgIGV4cGVjdChyZXN1bHQuc3VjY2VzcykudG9CZVRydXRoeSgpO1xuXG4gICAgZXhwb3J0VHJhbnNhY3Rpb25zKENPTVBBTllfSUQsIHJlc3VsdC5hY2NvdW50cyB8fCBbXSk7XG4gIH0pO1xufSk7XG4iXX0=