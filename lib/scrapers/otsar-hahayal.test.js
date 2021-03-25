"use strict";

require("core-js/modules/es.promise");

require("core-js/modules/es.string.trim");

var _otsarHahayal = _interopRequireDefault(require("./otsar-hahayal"));

var _testsUtils = require("../tests/tests-utils");

var _definitions = require("../definitions");

var _baseScraperWithBrowser = require("./base-scraper-with-browser");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const COMPANY_ID = 'otsarHahayal'; // TODO this property should be hard-coded in the provider

const testsConfig = (0, _testsUtils.getTestsConfig)();
describe('OtsarHahayal legacy scraper', () => {
  beforeAll(() => {
    (0, _testsUtils.extendAsyncTimeout)(); // The default timeout is 5 seconds per async test, this function extends the timeout value
  });
  test('should expose login fields in scrapers constant', () => {
    expect(_definitions.SCRAPERS.otsarHahayal).toBeDefined();
    expect(_definitions.SCRAPERS.otsarHahayal.loginFields).toContain('username');
    expect(_definitions.SCRAPERS.otsarHahayal.loginFields).toContain('password');
  });
  (0, _testsUtils.maybeTestCompanyAPI)(COMPANY_ID, config => config.companyAPI.invalidPassword)('should fail on invalid user/password"', async () => {
    const options = _objectSpread({}, testsConfig.options, {
      companyId: COMPANY_ID
    });

    const scraper = new _otsarHahayal.default(options);
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

    const scraper = new _otsarHahayal.default(options);
    const result = await scraper.scrape(testsConfig.credentials.otsarHahayal);
    expect(result).toBeDefined();
    const error = `${result.errorType || ''} ${result.errorMessage || ''}`.trim();
    expect(error).toBe('');
    expect(result.success).toBeTruthy();
    (0, _testsUtils.exportTransactions)(COMPANY_ID, result.accounts || []);
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JhcGVycy9vdHNhci1oYWhheWFsLnRlc3QudHMiXSwibmFtZXMiOlsiQ09NUEFOWV9JRCIsInRlc3RzQ29uZmlnIiwiZGVzY3JpYmUiLCJiZWZvcmVBbGwiLCJ0ZXN0IiwiZXhwZWN0IiwiU0NSQVBFUlMiLCJvdHNhckhhaGF5YWwiLCJ0b0JlRGVmaW5lZCIsImxvZ2luRmllbGRzIiwidG9Db250YWluIiwiY29uZmlnIiwiY29tcGFueUFQSSIsImludmFsaWRQYXNzd29yZCIsIm9wdGlvbnMiLCJjb21wYW55SWQiLCJzY3JhcGVyIiwiT3RzYXJIYWhheWFsU2NyYXBlciIsInJlc3VsdCIsInNjcmFwZSIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJzdWNjZXNzIiwidG9CZUZhbHN5IiwiZXJyb3JUeXBlIiwidG9CZSIsIkxvZ2luUmVzdWx0cyIsIkludmFsaWRQYXNzd29yZCIsImNyZWRlbnRpYWxzIiwiZXJyb3IiLCJlcnJvck1lc3NhZ2UiLCJ0cmltIiwidG9CZVRydXRoeSIsImFjY291bnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFDQTs7QUFHQTs7QUFDQTs7Ozs7Ozs7OztBQUVBLE1BQU1BLFVBQVUsR0FBRyxjQUFuQixDLENBQW1DOztBQUNuQyxNQUFNQyxXQUFXLEdBQUcsaUNBQXBCO0FBRUFDLFFBQVEsQ0FBQyw2QkFBRCxFQUFnQyxNQUFNO0FBQzVDQyxFQUFBQSxTQUFTLENBQUMsTUFBTTtBQUNkLDBDQURjLENBQ1E7QUFDdkIsR0FGUSxDQUFUO0FBSUFDLEVBQUFBLElBQUksQ0FBQyxpREFBRCxFQUFvRCxNQUFNO0FBQzVEQyxJQUFBQSxNQUFNLENBQUNDLHNCQUFTQyxZQUFWLENBQU4sQ0FBOEJDLFdBQTlCO0FBQ0FILElBQUFBLE1BQU0sQ0FBQ0Msc0JBQVNDLFlBQVQsQ0FBc0JFLFdBQXZCLENBQU4sQ0FBMENDLFNBQTFDLENBQW9ELFVBQXBEO0FBQ0FMLElBQUFBLE1BQU0sQ0FBQ0Msc0JBQVNDLFlBQVQsQ0FBc0JFLFdBQXZCLENBQU4sQ0FBMENDLFNBQTFDLENBQW9ELFVBQXBEO0FBQ0QsR0FKRyxDQUFKO0FBTUEsdUNBQW9CVixVQUFwQixFQUFpQ1csTUFBRCxJQUFZQSxNQUFNLENBQUNDLFVBQVAsQ0FBa0JDLGVBQTlELEVBQStFLHVDQUEvRSxFQUF3SCxZQUFZO0FBQ2xJLFVBQU1DLE9BQU8scUJBQ1JiLFdBQVcsQ0FBQ2EsT0FESjtBQUVYQyxNQUFBQSxTQUFTLEVBQUVmO0FBRkEsTUFBYjs7QUFLQSxVQUFNZ0IsT0FBTyxHQUFHLElBQUlDLHFCQUFKLENBQXdCSCxPQUF4QixDQUFoQjtBQUVBLFVBQU1JLE1BQU0sR0FBRyxNQUFNRixPQUFPLENBQUNHLE1BQVIsQ0FBZTtBQUFFQyxNQUFBQSxRQUFRLEVBQUUsUUFBWjtBQUFzQkMsTUFBQUEsUUFBUSxFQUFFO0FBQWhDLEtBQWYsQ0FBckI7QUFFQWhCLElBQUFBLE1BQU0sQ0FBQ2EsTUFBRCxDQUFOLENBQWVWLFdBQWY7QUFDQUgsSUFBQUEsTUFBTSxDQUFDYSxNQUFNLENBQUNJLE9BQVIsQ0FBTixDQUF1QkMsU0FBdkI7QUFDQWxCLElBQUFBLE1BQU0sQ0FBQ2EsTUFBTSxDQUFDTSxTQUFSLENBQU4sQ0FBeUJDLElBQXpCLENBQThCQyxxQ0FBYUMsZUFBM0M7QUFDRCxHQWJEO0FBZUEsdUNBQW9CM0IsVUFBcEIsRUFBZ0MsNkJBQWhDLEVBQStELFlBQVk7QUFDekUsVUFBTWMsT0FBTyxxQkFDUmIsV0FBVyxDQUFDYSxPQURKO0FBRVhDLE1BQUFBLFNBQVMsRUFBRWY7QUFGQSxNQUFiOztBQUtBLFVBQU1nQixPQUFPLEdBQUcsSUFBSUMscUJBQUosQ0FBd0JILE9BQXhCLENBQWhCO0FBQ0EsVUFBTUksTUFBTSxHQUFHLE1BQU1GLE9BQU8sQ0FBQ0csTUFBUixDQUFlbEIsV0FBVyxDQUFDMkIsV0FBWixDQUF3QnJCLFlBQXZDLENBQXJCO0FBQ0FGLElBQUFBLE1BQU0sQ0FBQ2EsTUFBRCxDQUFOLENBQWVWLFdBQWY7QUFDQSxVQUFNcUIsS0FBSyxHQUFJLEdBQUVYLE1BQU0sQ0FBQ00sU0FBUCxJQUFvQixFQUFHLElBQUdOLE1BQU0sQ0FBQ1ksWUFBUCxJQUF1QixFQUFHLEVBQXZELENBQXlEQyxJQUF6RCxFQUFkO0FBQ0ExQixJQUFBQSxNQUFNLENBQUN3QixLQUFELENBQU4sQ0FBY0osSUFBZCxDQUFtQixFQUFuQjtBQUNBcEIsSUFBQUEsTUFBTSxDQUFDYSxNQUFNLENBQUNJLE9BQVIsQ0FBTixDQUF1QlUsVUFBdkI7QUFFQSx3Q0FBbUJoQyxVQUFuQixFQUErQmtCLE1BQU0sQ0FBQ2UsUUFBUCxJQUFtQixFQUFsRDtBQUNELEdBZEQ7QUFlRCxDQXpDTyxDQUFSIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IE90c2FySGFoYXlhbFNjcmFwZXIgZnJvbSAnLi9vdHNhci1oYWhheWFsJztcbmltcG9ydCB7XG4gIG1heWJlVGVzdENvbXBhbnlBUEksIGV4dGVuZEFzeW5jVGltZW91dCwgZ2V0VGVzdHNDb25maWcsIGV4cG9ydFRyYW5zYWN0aW9ucyxcbn0gZnJvbSAnLi4vdGVzdHMvdGVzdHMtdXRpbHMnO1xuaW1wb3J0IHsgU0NSQVBFUlMgfSBmcm9tICcuLi9kZWZpbml0aW9ucyc7XG5pbXBvcnQgeyBMb2dpblJlc3VsdHMgfSBmcm9tICcuL2Jhc2Utc2NyYXBlci13aXRoLWJyb3dzZXInO1xuXG5jb25zdCBDT01QQU5ZX0lEID0gJ290c2FySGFoYXlhbCc7IC8vIFRPRE8gdGhpcyBwcm9wZXJ0eSBzaG91bGQgYmUgaGFyZC1jb2RlZCBpbiB0aGUgcHJvdmlkZXJcbmNvbnN0IHRlc3RzQ29uZmlnID0gZ2V0VGVzdHNDb25maWcoKTtcblxuZGVzY3JpYmUoJ090c2FySGFoYXlhbCBsZWdhY3kgc2NyYXBlcicsICgpID0+IHtcbiAgYmVmb3JlQWxsKCgpID0+IHtcbiAgICBleHRlbmRBc3luY1RpbWVvdXQoKTsgLy8gVGhlIGRlZmF1bHQgdGltZW91dCBpcyA1IHNlY29uZHMgcGVyIGFzeW5jIHRlc3QsIHRoaXMgZnVuY3Rpb24gZXh0ZW5kcyB0aGUgdGltZW91dCB2YWx1ZVxuICB9KTtcblxuICB0ZXN0KCdzaG91bGQgZXhwb3NlIGxvZ2luIGZpZWxkcyBpbiBzY3JhcGVycyBjb25zdGFudCcsICgpID0+IHtcbiAgICBleHBlY3QoU0NSQVBFUlMub3RzYXJIYWhheWFsKS50b0JlRGVmaW5lZCgpO1xuICAgIGV4cGVjdChTQ1JBUEVSUy5vdHNhckhhaGF5YWwubG9naW5GaWVsZHMpLnRvQ29udGFpbigndXNlcm5hbWUnKTtcbiAgICBleHBlY3QoU0NSQVBFUlMub3RzYXJIYWhheWFsLmxvZ2luRmllbGRzKS50b0NvbnRhaW4oJ3Bhc3N3b3JkJyk7XG4gIH0pO1xuXG4gIG1heWJlVGVzdENvbXBhbnlBUEkoQ09NUEFOWV9JRCwgKGNvbmZpZykgPT4gY29uZmlnLmNvbXBhbnlBUEkuaW52YWxpZFBhc3N3b3JkKSgnc2hvdWxkIGZhaWwgb24gaW52YWxpZCB1c2VyL3Bhc3N3b3JkXCInLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIC4uLnRlc3RzQ29uZmlnLm9wdGlvbnMsXG4gICAgICBjb21wYW55SWQ6IENPTVBBTllfSUQsXG4gICAgfTtcblxuICAgIGNvbnN0IHNjcmFwZXIgPSBuZXcgT3RzYXJIYWhheWFsU2NyYXBlcihvcHRpb25zKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNjcmFwZXIuc2NyYXBlKHsgdXNlcm5hbWU6ICdlMTBzMTInLCBwYXNzd29yZDogJzNmM3NzM2QnIH0pO1xuXG4gICAgZXhwZWN0KHJlc3VsdCkudG9CZURlZmluZWQoKTtcbiAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmVGYWxzeSgpO1xuICAgIGV4cGVjdChyZXN1bHQuZXJyb3JUeXBlKS50b0JlKExvZ2luUmVzdWx0cy5JbnZhbGlkUGFzc3dvcmQpO1xuICB9KTtcblxuICBtYXliZVRlc3RDb21wYW55QVBJKENPTVBBTllfSUQpKCdzaG91bGQgc2NyYXBlIHRyYW5zYWN0aW9uc1wiJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAuLi50ZXN0c0NvbmZpZy5vcHRpb25zLFxuICAgICAgY29tcGFueUlkOiBDT01QQU5ZX0lELFxuICAgIH07XG5cbiAgICBjb25zdCBzY3JhcGVyID0gbmV3IE90c2FySGFoYXlhbFNjcmFwZXIob3B0aW9ucyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2NyYXBlci5zY3JhcGUodGVzdHNDb25maWcuY3JlZGVudGlhbHMub3RzYXJIYWhheWFsKTtcbiAgICBleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xuICAgIGNvbnN0IGVycm9yID0gYCR7cmVzdWx0LmVycm9yVHlwZSB8fCAnJ30gJHtyZXN1bHQuZXJyb3JNZXNzYWdlIHx8ICcnfWAudHJpbSgpO1xuICAgIGV4cGVjdChlcnJvcikudG9CZSgnJyk7XG4gICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlVHJ1dGh5KCk7XG5cbiAgICBleHBvcnRUcmFuc2FjdGlvbnMoQ09NUEFOWV9JRCwgcmVzdWx0LmFjY291bnRzIHx8IFtdKTtcbiAgfSk7XG59KTtcbiJdfQ==