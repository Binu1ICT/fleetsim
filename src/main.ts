import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/** Bootstrap the standalone Angular application with the shared app configuration. */
void bootstrapApplication(AppComponent, appConfig).catch(console.error);
