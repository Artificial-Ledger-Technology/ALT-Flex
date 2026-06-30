# Security Testing Guide

Test your application against common attack vectors.

## SQL Injection Tests
Try these inputs in form fields:
- ' OR 1=1 --
- '; DROP TABLE users; --
- admin' --

## XSS Tests
- <script>alert(1)</script>
- <img onerror="alert(1)" src="x">

## Notes
- Only test on systems you own
- Use a staging environment
- Document all findings
