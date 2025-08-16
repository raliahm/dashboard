# 🛡️ Security Audit System Usage Guide

This dashboard project now includes a comprehensive security audit system to detect exposed API keys, secrets, and other security vulnerabilities.

## 🔧 Available Security Commands

### Quick Security Checks
- `npm run security:env` - Check environment variables for exposed secrets
- `npm run security:git` - Scan git history for committed secrets  
- `npm run security:deps` - Check dependencies for known vulnerabilities
- `npm run security:code` - Run code security linting

### Advanced Security Tools
- `npm run security:eslint` - Security-focused ESLint checking
- `npm run security:secretlint` - Advanced secret detection
- `npm run security:fix` - Auto-fix security vulnerabilities
- `npm run security:report` - Generate comprehensive security report
- `npm run security:full` - Run all security checks

## 🎯 What the System Detects

### Environment Security (`security:env`)
- API keys in .env files
- Database connection strings
- OAuth tokens and secrets
- Hardcoded passwords
- Configuration file vulnerabilities

### Git Security (`security:git`)
- Secrets committed to git history
- Exposed API keys in past commits
- Database URLs in version control
- Unsafe patterns in tracked files

### Dependency Security (`security:deps`)
- Known vulnerabilities in npm packages
- Outdated packages with security issues
- Critical and high severity issues

### Code Security (`security:code`)
- Unsafe coding patterns
- Potential injection vulnerabilities
- Insecure regular expressions
- Dangerous function usage

## 📊 Security Reports

The system generates detailed reports:
- `comprehensive-security-report.json` - Full technical details
- `security-report-summary.txt` - Human-readable summary
- `env-security-report.json` - Environment-specific issues
- `security-report.json` - Git security findings

## 🚨 Security Score System

- **A+ (90-100)**: Excellent security posture
- **A (80-89)**: Good security with minor issues  
- **B (70-79)**: Acceptable security, some improvements needed
- **C (60-69)**: Poor security, immediate attention required
- **D (50-59)**: Very poor security, major vulnerabilities
- **F (0-49)**: Critical security failures

## 🔄 Recommended Workflow

### Before Committing Code
```bash
npm run security:git
npm run security:env
```

### Weekly Security Review  
```bash
npm run security:full
```

### Before Production Deployment
```bash
npm run security:report
# Review the generated reports
npm run security:fix
```

## 🛠️ Configuration Files

- `.secretlintrc.json` - Secret detection rules
- `.eslintrc.security.js` - Security linting configuration
- `audit-ci.json` - Dependency audit settings
- `.env.example` - Environment variable template

## 🔒 Best Practices

### Environment Variables
1. Use `.env.local` for development secrets
2. Keep `.env.example` updated with placeholder values
3. Never commit real credentials to git
4. Use different secrets for dev/staging/production

### Git Security
1. Add sensitive patterns to `.gitignore`
2. Use git hooks for pre-commit secret scanning
3. Regularly scan git history for exposed secrets
4. Remove secrets from git history if found

### Dependencies
1. Run `npm audit` before adding new packages
2. Keep dependencies updated
3. Review security advisories regularly
4. Use `npm audit fix` to auto-resolve issues

### Code Security
1. Follow secure coding practices
2. Validate all user inputs
3. Use parameterized queries for databases
4. Implement proper authentication and authorization

## 🚨 Emergency Response

If secrets are detected:

1. **Immediate Action**
   - Rotate/invalidate the exposed credentials
   - Remove secrets from code immediately
   - Check if secrets were committed to git

2. **Git History Cleanup** (if secrets in git)
   ```bash
   # For recent commits (use with caution)
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch path/to/secret/file' \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Security Review**
   - Run full security audit
   - Check access logs for unauthorized usage
   - Update security procedures
   - Document incident and response

## 📞 Support

For security questions or incident response:
- Review the generated security reports
- Check the recommendations in `security-report-summary.txt`
- Follow the security best practices above
- Consider implementing automated security scanning in CI/CD

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular monitoring and updates are essential for maintaining a secure application.
