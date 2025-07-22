import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent, HttpHandler, HttpErrorResponse, HttpResponse, HttpHeaderResponse, HttpParams } from '@angular/common/http';
// import { HttpModule, RequestOptions, ResponseType } from '@angular/http';
import { map, catchError } from 'rxjs/operators';
import { ConfigVariables } from '../shard/config';
import { BehaviorSubject, Observable } from 'rxjs';

declare var $: any;
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private httpClient: HttpClient) { }

  public getAllDevices() {
    return this.httpClient.get(`${ConfigVariables.API_URL}/channels?token_id=${ConfigVariables.Token}`)
      .pipe(map(result => {
        return result;
      }), catchError(
        (error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }

  public getFieldsById(id: any) {
    return this.httpClient.get(`${ConfigVariables.API_URL}/channels/${id}?token_id=${ConfigVariables.Token}`)
      .pipe(map(result => {
        return result;
      }), catchError(
        (error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }


  public getAllData(id: any, from: any, to: any) {
    return this.httpClient.get(`${ConfigVariables.API_URL}/channels/${id}/feeds?end=${to}&start=${from}&timezone=Asia%2FRiyadh&token_id=${ConfigVariables.Token}`)
      .pipe(map(result => {
        return result;
      }), catchError(
        (error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }

  public getAllData2(id: any, from: any, to: any , field:any) {
    return this.httpClient.get(`${ConfigVariables.API_URL}/channels/${id}/feeds.csv?fahrenheit=false&results=8000&field_list=${field}&end=${to}&start=${from}&timezone=Asia%2FRiyadh&token_id=${ConfigVariables.Token}` , { responseType: 'text' })
      .pipe(map(result => {
        return result;
      }), catchError(
        (error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }

  public getAllTriggers(id: any) {
    return this.httpClient.get(`${ConfigVariables.API_URL}/triggers?channel_id=${id}&itemsPerPage=all&pageNumber=0&token_id=${ConfigVariables.Token}`)
      .pipe(map(result => {
        return result;
      }), catchError(
        (error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }

  public getAllTriggersDevices() {
    return this.httpClient.get(`${ConfigVariables.API_URL}/triggers?channel_id=&itemsPerPage=1000&pageNumber=0&token_id=${ConfigVariables.Token}`)
      .pipe(map(result => {
        return result;
      }), catchError(
        (error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }

}

