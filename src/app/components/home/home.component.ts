import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../public/network/api.service';
import { Workbook } from 'exceljs';
import * as fs from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// import 'jspdf-autotable';
import { fontVariable } from '../../../../public/shard/fontVariable';
import html2canvas from 'html2canvas';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexTooltip
} from 'ng-apexcharts';
import { DatePipe } from '@angular/common';
import { NgxSpinnerService } from 'ngx-spinner';
import { ConfigVariables } from '../../../../public/shard/config';
import { NoteTrackerService } from '../../services/note-database.service';
import { HttpClient } from '@angular/common/http';
// import { Papa } from 'papaparse'; // or directly from 'papaparse'
import * as Papa from 'papaparse';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  allDevicesLabels: ApexDataLabels;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  objFileds: any

  constructor(
    private http: HttpClient,
     private noteTracker: NoteTrackerService,
     private apiService: ApiService, private datePipe: DatePipe, private spinner: NgxSpinnerService
  ) { }

  numberPage = 1
  logoImage = new Image();
  pdfObject: any;
  fontvariable: fontVariable = new fontVariable();

  from: any = ''
  to: any = ''
  maxToDate: any = ''
  chartDataOptions: any = {};
  chartAlertsOptions: any = {};
  chartDataGraphOptions: any = {};
  chartAlertsGraphOptions: any = {};
  originalDevices: any = [];
  allDevices: any = []
  selectDevice = '';
  originalFields: any = [];
  allFields: any = []
  selectField = '';
  submitted = false
  noData = false

  ngOnInit(): void {
    this.logoImage.src = ConfigVariables.LogPdf

    // get all devices 
    this.apiService.getAllDevices().subscribe((res: any) => {
      let data = res.channels
      this.originalDevices = data.map((item: any) => ({
        value: item.channel_id,
        label: item.name
      }));
      this.allDevices = [...this.originalDevices]
    })
  }

  selectDevicess(event: any) {
    this.selectField = ''
    this.apiService.getFieldsById(event.value).subscribe((res: any) => {
      const obj = res.channel
      this.objFileds = obj
      this.originalFields = Object.keys(obj)
        .filter(key => key.startsWith("field") && typeof obj[key] === "string" && obj[key].trim() !== "")
        .map(key => ({
          value: obj[key],
          label: obj[key]
        }));
      this.allFields = [...this.originalFields]
    })
  }

  searchDevice(term: any) {
    this.originalFields = []
    this.allFields = []
    if (term.search == '') {
      this.allDevices = this.originalDevices
    } else {
      this.selectDevice = ''
      let search = term.search.toLowerCase();
      this.allDevices = this.originalDevices.filter((option: any) =>
        option.label.toLowerCase().includes(search)
      );
    }
  }

  searchField(term: any) {
    if (term.search == '') {
      this.allFields = this.originalFields
    } else {
      this.selectField = ''
      let search = term.search.toLowerCase();
      this.allFields = this.originalFields.filter((option: any) =>
        option.label.toLowerCase().includes(search)
      );
    }
  }

  openDevice(e: any) {
    this.allDevices = [...this.originalDevices]
  }

  openFeild(e: any) {
    this.allFields = [...this.originalFields]
  }

  changeTime(date: any) {
    var currentDateobj = new Date();
    var oneDay = 1000 * 60 * 60 * 24
    var threeHours = 1000 * 60 * 60 * 3
    var now = (new Date(currentDateobj.getTime() + (1000 * 60 * 60 * 3))).toISOString().slice(0, -5);
    var Day = (new Date(currentDateobj.getTime() - oneDay + threeHours)).toISOString().slice(0, -5);
    var Weak = (new Date(currentDateobj.getTime() - 7 * oneDay + threeHours)).toISOString().slice(0, -5);
    var Month = (new Date(currentDateobj.getTime() - 30 * oneDay + threeHours)).toISOString().slice(0, -5);
    if (date == 'D') {
      this.from = Day
      this.to = now;
    } else if (date == 'W') {
      this.from = Weak
      this.to = now;
    } else {
      this.from = Month
      this.to = now;
    }
  }

  view() {
    this.submitted = true
    if (this.selectDevice != undefined && this.from != '' && this.to != '') {
      this.spinner.show()
      if (this.from.length == 16) this.from += ':00'
      if (this.to.length == 16) this.to += ':00'

      const field = Object.keys(this.objFileds).find(key => this.objFileds[key] === this.selectField);
      this.apiService.getAllData2(this.selectDevice, this.from.replace('T', '+'), this.to.replace('T', '+'), field).subscribe((res: any) => {
        const result = Papa.parse(res, {
          header: true,
          skipEmptyLines: true
        });

        let allData: any = result.data;
        const selectedKey = allData.length > 0 ? Object.keys(allData[0]).find(key => key.includes(this.selectField)) : null;

        this.noteTracker.getAllNotes().then(notes => {
          const triggers = notes.filter(item => item.channelId_field === `${this.selectDevice} ${field}`);
          const arrTriggers = triggers
            .filter((item: any) => {
              const createdAt = new Date(item.time);
              const inRange = createdAt >= new Date(this.from) && createdAt <= new Date(this.to);
              return inRange;
            })
            .map((item: any) => ({
              created_at: item.time,
              value: item.value,
              nt: item.note
            }));

          const result = allData
            .filter((item: any) => item[selectedKey!] !== undefined && Number(item[selectedKey!]))
            .map((item: any) => ({
              created_at: item.created_at,
              value: item[selectedKey!],
              // nt: item.nt === '0' || item.nt === '1' ? '' : (item.nt || '')
            }));
          // const merged = [...result, ...arrTriggers];
          // merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          this.drawGraph(result, this.chartDataOptions, 'Data Graph')
          this.drawGraph(arrTriggers, this.chartAlertsOptions, 'Alerts with notes')
        });
      }, err => {
        this.spinner.hide()
      })
    }
  }

  drawGraph(arr: any, chartOptions: any, title: string) {
    let values = arr.map((element: any) => element.value)
    let xCategories = arr.map((element: any) => element.created_at)

    let updatedOptions = {
      series: [
        {
          name: '',
          data: values
        },
      ],
      title: {
        text: title,
        align: 'left', // or 'center' or 'right'
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'white'
        }
      },
      chart: {
        type: title.includes('Data') ? 'line' : 'scatter',
        height: 350,
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        categories: xCategories,
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          style: {
            colors: 'white',
            fontSize: '12px',
          }
        }
      },
      yaxis: {
        labels: {
          formatter: function (val: number) {
            return Math.round(val * 10) / 10
          },
          style: {
            colors: 'white',
            fontSize: '12px',
          }
        }
      },
      // tooltip: {
      //   x: {
      //     format: 'dd MMM yyyy HH:mm',
      //   },
      //   y: {
      //     formatter: (val: number, opts: any) => {
      //       const index = opts.dataPointIndex;
      //       const message = arr[index].nt;
      //       return message != '' ? `${val} — ${message}` : `${val}`;
      //     }
      //   }
      // },
      tooltip: {
        x: {
          format: 'dd MMM yyyy HH:mm:ss',
        },
        custom: function ({
          series,
          seriesIndex,
          dataPointIndex,
          w
        }: {
          series: number[][],
          seriesIndex: number,
          dataPointIndex: number,
          w: any
        }) {
          const val = Math.round(series[seriesIndex][dataPointIndex] * 10) / 10;
          const message = arr[dataPointIndex]?.nt || '';
          const hasMessage = message !== '';
          const color = hasMessage ? '#FF0000' : '#000000';
          return `
            <div style="padding: 6px; font-size: 14px;">
              <span style="color: ${color}; font-weight: bold;">${val}</span>
              ${hasMessage ? `<div style="margin-top: 4px; color: ${color};">${message}</div>` : ''}
            </div>
              `;
        }
      },
      noData: {
        text: 'No data available',
        align: 'center',
        verticalAlign: 'middle',
        style: {
          color: '#999',
          fontSize: '16px'
        }
      }
    };

    if (title.includes('Data')) {
      this.chartDataOptions = updatedOptions;
    } else {
      this.chartAlertsOptions = updatedOptions;
    }

    document.getElementById('graph')!.scrollIntoView({ behavior: 'smooth', block: 'center' })
    this.spinner.hide()
  }

  formatDate(date: Date): string {
    // const newDate = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    return this.datePipe.transform(date, 'yyyy-MM-dd HH:mm:ss')!;
  }


  formatDateWithoutSeconds(date: Date): string {
    return this.datePipe.transform(date, 'yyyy-MM-dd HH:mm')!;
  }

  exportToExcel() {
    this.submitted = true
    if (this.selectDevice != undefined && this.from != '' && this.to != '') {
      if (this.from.length == 16) this.from += ':00'
      if (this.to.length == 16) this.to += ':00'
      this.spinner.show()

      const field = Object.keys(this.objFileds).find(key => this.objFileds[key] === this.selectField);
      this.apiService.getAllData2(this.selectDevice, this.from.replace('T', '+'), this.to.replace('T', '+'), field).subscribe((res: any) => {
        const result = Papa.parse(res, {
          header: true,
          skipEmptyLines: true
        });

        let allData: any = result.data;
        const selectedKey = allData.length > 0 ? Object.keys(allData[0]).find(key => key.includes(this.selectField)) : null;

        this.noteTracker.getAllNotes().then(notes => {
          const triggers = notes.filter(item => item.channelId_field === `${this.selectDevice} ${field}`);
          const arrTriggers = triggers
            .filter((item: any) => {
              const createdAt = new Date(item.time);
              const inRange = createdAt >= new Date(this.from) && createdAt <= new Date(this.to);
              return inRange;
            })
            .map((item: any) => ({
              created_at: this.formatDateWithoutSeconds(item.created_at),
              value: item.value,
              nt: item.note,
              timeOfComment: this.formatDateWithoutSeconds(item.time)
            }));

          const result = allData
            .filter((item: any) => item[selectedKey!] !== undefined)
            .map((item: any) => ({
              created_at: this.formatDateWithoutSeconds(item.created_at),
              value: item[selectedKey!],
              // nt: item.nt === '0' || item.nt === '1' ? '' : (item.nt || '')
            }));

          // First, ensure all dates are in the same format (ISO strings are fine)
          const merged = [...result, ...arrTriggers];
          // Sort by `created_at` date
          merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          let excelData = merged;
          if (excelData.length > 0) {
            const title = 'Device Report';
            let data: any = [];
            let header = [this.selectField, 'Date & time', 'Comment', 'Time of comment'];
            let d = this.selectField == 'Temperature' ? ' °C' : this.selectField == 'Humidity' ? ' %' : ''
            excelData.forEach((report: any) => {
              let x = [
                Math.round(report.value * 10) / 10 + d,
                report.created_at,
                report.nt,
                report.timeOfComment
              ];
              data.push(x);
            });
            let workbook = new Workbook();
            let worksheet = workbook.addWorksheet(title);

            let headerRow = worksheet.addRow(header);
            headerRow.font = {
              // name: 'Comic Sans MS',
              family: 4,
              size: 13,
              bold: true,
            };
            headerRow.height = 25;
            data.forEach((d: any) => {
              let row = worksheet.addRow(d);
              row.height = 20;
            });
            worksheet.columns.forEach(function (column: any, i: any) {
              let maxLength = 0;
              column['eachCell']({ includeEmpty: true }, function (cell: any) {
                let columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                  maxLength = columnLength;
                }
              });
              column.width = maxLength < 10 ? 10 : maxLength;
            });
            worksheet.eachRow(function (Row, rowNum) {
              Row.eachCell(function (Cell, cellNum) {
                Cell.alignment = {
                  vertical: 'middle',
                  horizontal: 'center',
                };
              });
            });
            workbook.xlsx.writeBuffer().then((data) => {
              let blob = new Blob([data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              });
              fs.saveAs(blob, title + '.xlsx');
              this.spinner.hide()

            });
          } else {
            this.spinner.hide()
          }
        })
      },
        (error) => {
          this.spinner.hide()
        }
      );
    }

  }


  exportToPdf() {

    this.submitted = true
    this.numberPage = 1
    if (this.selectDevice != undefined && this.from != '' && this.to != '') {
      if (this.from.length == 16) this.from += ':00'
      if (this.to.length == 16) this.to += ':00'
      this.spinner.show()

      this.pdfObject = new jsPDF('p', 'mm', 'a4');
      // this.pdfObject = new jsPDF('p', 'pt', 'letter');

      this.pdfObject.addFileToVFS(
        'Amiri-Bold-normal.ttf',
        this.fontvariable.font
      );

      this.pdfObject.setTextColor("#000000");
      this.pdfObject.setFontSize(12);

      const pageWidth = this.pdfObject.internal.pageSize.getWidth();

      const text = 'Data Report';
      this.pdfObject.setFontSize(50);

      const textWidth = this.pdfObject.getTextWidth(text);
      this.pdfObject.setTextColor("#0000ff");
      const x = (pageWidth - textWidth) / 2;
      this.pdfObject.text(text, x, 40);

      this.pdfObject.setFontSize(20);
      this.pdfObject.setTextColor("#000000");

      const selectedLabel = this.allDevices.find((item: any) => item.value === this.selectDevice)?.label;
      const textChannel = 'Channel Name: ' + selectedLabel;
      const textChannelWidth = this.pdfObject.getTextWidth(textChannel);
      const x2 = (pageWidth - textChannelWidth) / 2;
      this.pdfObject.text(textChannel, x2, 60);

      const textDate = 'Data Start: ' + this.formatDate(this.from) + ' To ' + this.formatDate(this.to);
      const textDateWidth = this.pdfObject.getTextWidth(textDate);
      const x3 = (pageWidth - textDateWidth) / 2;
      this.pdfObject.text(textDate, x3, 70);

      const textGenerated = 'Report Generated: ' + this.formatDate(new Date());
      const textGeneratedWidth = this.pdfObject.getTextWidth(textGenerated);
      const x4 = (pageWidth - textGeneratedWidth) / 2;
      this.pdfObject.text(textGenerated, x4, 80);

      const textZone = 'Timezone: Asia/Riyadh';
      const textZonedWidth = this.pdfObject.getTextWidth(textZone);
      const x5 = (pageWidth - textZonedWidth) / 2;
      this.pdfObject.text(textZone, x5, 90);

      this.pdfObject.setFontSize(15);
      this.pdfObject.setLineWidth(0.5);
      this.pdfObject.line(10, 95, pageWidth - 10, 95);
      this.pdfObject.text('Data Summary', 10, 105, 'left');
      this.pdfObject.line(10, 130, pageWidth - 10, 130);

      const field = Object.keys(this.objFileds).find(key => this.objFileds[key] === this.selectField);
      this.apiService.getAllData2(this.selectDevice, this.from.replace('T', '+'), this.to.replace('T', '+'), field).subscribe((res: any) => {
        const result = Papa.parse(res, {
          header: true,
          skipEmptyLines: true
        });

        let allData: any = result.data;
        const selectedKey = allData.length > 0 ? Object.keys(allData[0]).find(key => key.includes(this.selectField)) : null;

        this.noteTracker.getAllNotes().then(notes => {
          const triggers = notes.filter(item => item.channelId_field === `${this.selectDevice} ${field}`);
          const arrTriggers = triggers
            .filter((item: any) => {
              const createdAt = new Date(item.time);
              const inRange = createdAt >= new Date(this.from) && createdAt <= new Date(this.to);
              return inRange;
            })
            .map((item: any) => ({
              created_at: this.formatDateWithoutSeconds(item.created_at),
              value: item.value,
              nt: item.note,
              timeOfComment: this.formatDateWithoutSeconds(item.time)
            }));

          const result = allData
            .filter((item: any) => item[selectedKey!] !== undefined && Number(item[selectedKey!]))
            .map((item: any) => ({
              created_at: this.formatDateWithoutSeconds(item.created_at),
              value: item[selectedKey!],
              // nt: item.nt === '0' || item.nt === '1' ? '' : (item.nt || '')
            }));

          const merged = [...result, ...arrTriggers];
          merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());


          let values1 = result.map((el: any) => el.value);
          let xCategories1 = result.map((el: any) => el.created_at);

          let values2 = arrTriggers.map((el: any) => el.value);
          let xCategories2 = arrTriggers.map((el: any) => el.timeOfComment);

          this.chartDataGraphOptions = {}; // feeds
          this.chartAlertsGraphOptions = {};

          // Build chart options
          this.chartDataGraphOptions = {
            series: [{ name: '', data: values1 }],
            chart: { type: 'line', height: 350, toolbar: { show: false } },
            dataLabels: { enabled: false },
            xaxis: {
              categories: xCategories1,
              type: 'datetime',
              labels: {
                datetimeUTC: false,
                style: {
                  colors: 'black',
                  fontSize: '12px',
                }
              }
            },
            yaxis: {
              labels: {
                formatter: function (val: number) {
                  return Math.round(val * 10) / 10
                },
                style: {
                  colors: 'black',
                  fontSize: '12px',
                }
              }
            },
            title: {
              text: 'Data Graph',
              align: 'left', // or 'center' or 'right'
              style: {
                fontSize: '10px',
                fontWeight: 'bold',
                color: 'black'
              }
            },
            noData: {
              text: 'No data available',
              align: 'center',
              verticalAlign: 'middle',
              style: { color: '#999', fontSize: '16px' }
            }
          };

          this.chartAlertsGraphOptions = {
            series: [{ name: '', data: values2 }],
            chart: { type: 'scatter', height: 350, toolbar: { show: false } },
            dataLabels: { enabled: false },
            xaxis: {
              categories: xCategories2,
              type: 'datetime',
              labels: {
                datetimeUTC: false,
                style: {
                  colors: 'black',
                  fontSize: '12px',
                }
              }
            },
            yaxis: {
              labels: {
                formatter: function (val: number) {
                  return Math.round(val * 10) / 10
                },
                style: {
                  colors: 'black',
                  fontSize: '12px',
                }
              }
            },
            title: {
              text: 'Alerts with notes',
              align: 'left', // or 'center' or 'right'
              style: {
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'black'
              }
            },
            noData: {
              text: 'No data available',
              align: 'center',
              verticalAlign: 'middle',
              style: { color: '#999', fontSize: '16px' }
            }
          };

          setTimeout(() => {
            const diagram = document.getElementById('diagram');
            const diagram2 = document.getElementById('diagram2');
            if (!diagram) return;
            if (!diagram2) return;

            // Temporarily show chart for rendering
            // diagram.style.position = 'static';
            // diagram.style.left = '0';
            diagram.style.display = 'block';
            diagram2.style.display = 'block';

            // Wait for chart to render (important)
            setTimeout(() => {
              html2canvas(diagram!, {
                scale: 2, // زيد الدقة
                allowTaint: true,
                useCORS: true
              }).then((canvas1: any) => {
                const width = this.pdfObject.internal.pageSize.getWidth();

                const image1 = canvas1.toDataURL('image/png');
                // this.pdfObject.addImage(image1, 'JPEG', 5, 130, width - 6, 60);

                const pageWidth = this.pdfObject.internal.pageSize.getWidth();
                const imgWidth = pageWidth * 0.65; // 50%
                const xPosition = (pageWidth - imgWidth) / 2; // للتمركز في المنتصف (اختياري)
                this.pdfObject.addImage(image1, 'JPEG', xPosition, 132, imgWidth, 60);

                html2canvas(diagram2!, {
                  scale: 2, // زيد الدقة
                  allowTaint: true,
                  useCORS: true
                }).then((canvas2: any) => {
                  const image2 = canvas2.toDataURL('image/png');
                  // this.pdfObject.addImage(image2, 'JPEG', 5, 210, width - 6, 60);
                  this.pdfObject.addImage(image2, 'JPEG', xPosition, 212, imgWidth, 60);


                  diagram!.style.display = 'none';
                  diagram2!.style.display = 'none';


                  // html2canvas(diagram, { allowTaint: true }).then(canvas => {
                  //   const image = canvas.toDataURL("image/png");
                  //   const width = this.pdfObject.internal.pageSize.getWidth();

                  //   this.pdfObject.addImage(image, 'JPEG', 5, 150, width - 10, 70);

                  //   // Hide again
                  //   diagram.style.display = 'none';
                  //   // diagram.style.position = 'absolute';
                  //   // diagram.style.left = '-1000px';

                  // Continue with table + footer
                  const allValues = merged.map((item: any) => item.value && Number(item.value));
                  const max = merged.length ? Math.round(Math.max(...allValues) * 10) / 10 : '--';
                  const min = merged.length ? Math.round(Math.min(...allValues) * 10) / 10 : '--';
                  const avg = merged.length ? Math.round(allValues.reduce((sum: any, val: any) => sum + val, 0) / allValues.length * 10) / 10 : '--'
                  // (allValues.reduce((sum: any, val: any) => sum + val, 0) / allValues.length).toFixed(2) : '--';

                  let d = this.selectField == 'Temperature' ? ' °C' : this.selectField == 'Humidity' ? ' %' : ''
                  const tableData = merged.map((item: any) => [
                    Math.round(item.value * 10) / 10 + d,
                    item.created_at,
                    item.nt,
                    item.timeOfComment
                  ]);

                  autoTable(this.pdfObject, {
                    head: [['Sensor', 'Maximum', 'Minimum', 'Average']],
                    body: [[this.selectField, max, min, avg]],
                    startY: 110,
                    tableWidth: 190,
                    margin: { top: 30, right: 8, bottom: 30, left: 10 },
                  });

                  autoTable(this.pdfObject, {
                    head: [[this.selectField, 'Date & time', 'Comment', 'Time of comment']],
                    body: tableData,
                    startY: 300,
                    tableWidth: 190,
                    margin: { top: 30, right: 8, bottom: 10, left: 10 },
                    didParseCell: function (data: any) {
                      if (data.section === 'body') {
                        const nt = data.row.raw[2]; // nt value (3rd column)
                        if (nt && nt != '' && nt != '0' && nt != '1') {
                          data.cell.styles.fillColor = [255, 255, 0]; // Yellow background
                        }
                      }
                      if (data.column.index === 0 || data.column.index === 1 || data.column.index === 3) {
                        data.cell.styles.cellWidth = 'wrap'; // auto width
                        data.cell.styles.overflow = 'linebreak'; // do not cut
                        data.cell.styles.whiteSpace = 'nowrap';
                      }
                    }
                  });

                  // Footer
                  const totalPages = this.pdfObject.internal.getNumberOfPages();
                  const height = this.pdfObject.internal.pageSize.getHeight();
                  const pageWidth = this.pdfObject.internal.pageSize.getWidth();

                  for (let i = 1; i <= totalPages; i++) {
                    this.pdfObject.setPage(i);
                    this.pdfObject.addImage(this.logoImage, 'png', 10, 5, 30, 15);

                    const text = `${i} of ${totalPages}`;
                    const textWidth = this.pdfObject.getTextWidth(text);
                    const x = (pageWidth - textWidth) / 2;
                    this.pdfObject.text(text, x, height - 8);
                  }

                  //Save the PDF
                  this.pdfObject.save('Device Report.pdf');
                  this.spinner.hide();
                });
              });
            }, 700);
          }, 300);
        })



        // });
      })

    }



  }

  fromChange() {
    this.to = ''
    if (this.from) {
      let fromDate = new Date(this.from)
      let maxDate = new Date(fromDate)
      maxDate.setDate(fromDate.getDate() + 30)
      this.maxToDate = this.formatDateLocal(maxDate)
    } else {
      this.maxToDate = null
    }
  }

  formatDateLocal(date: any) {
    let pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

}
