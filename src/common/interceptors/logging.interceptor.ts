import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || request.connection.remoteAddress;

    const now = Date.now();
    this.logger.log(`Incoming Request: ${method} ${url} - ${ip} - ${userAgent}`);

    if (Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const delay = Date.now() - now;
          
          this.logger.log(`Outgoing Response: ${method} ${url} - ${statusCode} - ${delay}ms`);
          
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`Response Body: ${JSON.stringify(data)}`);
          }
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(`Request Error: ${method} ${url} - ${error.message} - ${delay}ms`);
        },
      }),
    );
  }
}
