# Unit Test Generator

Generate unit test templates following AAA pattern.

## AAA Pattern
- Arrange: set up test data
- Act: execute the function under test
- Assert: verify the result

## Template
```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should return expected result when given valid input', () => {
      // Arrange
      const input = 'test';
      // Act
      const result = instance.method(input);
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```
