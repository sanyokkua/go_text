# Logging Best Practices for Go & Desktop Applications

## Logging Levels and When to Use Them

### Level Hierarchy (most to least severe):
- **FATAL**: Application cannot continue; immediate shutdown required
- **ERROR**: Unexpected failures that prevent normal operation but application continues
- **WARN**: Unexpected but recoverable situations; potential issues that don't block functionality
- **INFO**: Normal operational events; key milestones and business logic execution
- **DEBUG**: Detailed diagnostic information for development debugging
- **TRACE**: Very fine-grained details showing code execution flow

### What to Log at Each Level:
- **FATAL**: Critical system failures, unrecoverable errors
- **ERROR**: Failed operations, exceptions, database connection failures
- **WARN**: Deprecated API usage, performance bottlenecks, retryable failures
- **INFO**: Application startup/shutdown, user actions, successful transactions
- **DEBUG**: Variable states, function parameters, performance metrics during development
- **TRACE**: Every function call, detailed state changes (development only)

## Message Format and Structure

### Structured Logging:
- Use JSON format for machine-readable logs with key-value pairs
- Include consistent fields: timestamp, level, message, context, correlation_id
- Example format: `{"time":"2024-01-01T12:00:00Z","level":"INFO","msg":"User login successful","user_id":"123","correlation_id":"abc123"}`

### Message Content Guidelines:
- **Be concise but descriptive**: "User authentication failed" instead of "Auth error"
- **Use complete sentences** with proper grammar and punctuation
- **Include context**: what happened, why it matters, and potential impact
- **Avoid sensitive data**: never log passwords, PII, tokens, or financial data
- **Include error details**: stack traces for ERROR/FATAL levels, but sanitize sensitive info

## What to Log vs. What Not to Log

### Log These:
- **All errors and exceptions** with stack traces
- **Key business events**: user logins, transactions, configuration changes
- **Performance metrics**: slow operations, timeouts, resource usage
- **Configuration changes**: application startup parameters, runtime config updates
- **External dependencies**: API calls, database queries, third-party service interactions

### Never Log:
- **Personal Identifiable Information (PII)**: names, emails, addresses
- **Authentication credentials**: passwords, API keys, tokens, session IDs
- **Financial data**: credit card numbers, bank account details
- **Raw request/response bodies** containing sensitive information
- **DEBUG/TRACE logs in production** - too much noise and potential security risk

## Go-Specific Best Practices

### Library Selection:
- Use `log/slog/zerolog` (standard library) for modern structured logging
- For high-throughput applications, implement buffered and asynchronous logging
- Consider third-party libraries like Zap or Logrus for advanced features

### Performance Optimization:
- **Check log levels before expensive operations**: `if logger.Enabled(context.Background(), slog.LevelDebug) { ... }`
- **Avoid string formatting overhead** when logs won't be output
- **Wrap errors properly**: use `fmt.Errorf` with `%w` for error wrapping
- **Standardize logging interfaces** across your codebase

## Desktop Application Considerations

### User Experience:
- **Allow configurable verbosity**: let users select logging levels through preferences
- **Implement log rotation** to prevent disk space exhaustion
- **Provide log viewing capability** within the application UI for support
- **Store logs in appropriate locations**: OS-specific data directories (AppData on Windows, ~/Library on macOS)

### Traceability Features:
- **Generate correlation IDs** at application startup or for user sessions
- **Propagate context** across async operations and threads
- **Include system information**: OS version, application version, hardware specs
- **Timestamp all entries** with high precision (microseconds)

## Production Logging Standards

### Essential Fields for Every Log:
```json
{
  "timestamp": "ISO8601 format",
  "level": "INFO/ERROR/WARN",
  "message": "Human-readable description",
  "correlation_id": "Unique request/session ID",
  "service": "Application name",
  "version": "App version",
  "context": {
    "user_id": "123",
    "operation": "login",
    "duration_ms": 45
  }
}
```

### Configuration Guidelines:
- **Production default level**: INFO (WARN/ERROR always enabled)
- **Centralize logs**: ship to logging platform (ELK, Datadog, etc.)
- **Set retention policies**: automatically archive/delete old logs
- **Implement sampling**: for high-volume DEBUG logs, sample instead of logging all

## Common Anti-Patterns to Avoid

- **Logging everything at INFO level** - defeats the purpose of level filtering
- **Including sensitive data** in logs - major security risk
- **Unstructured text logs** - impossible to query and analyze effectively
- **Missing correlation IDs** - cannot trace requests across components
- **Logging without context** - "Error occurred" without details is useless