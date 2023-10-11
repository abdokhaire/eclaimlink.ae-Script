// ==UserScript==
// @name         eclaimlink.ae Export to CSV Script
// @namespace    https://github.com/abdokhaire/eclaimlink.ae-Script
// @version      0.2
// @description  This Script will add two buttons to the transaction list which will allow you extract CSV file with all the data required
// @author       You
// @match        https://*.eclaimlink.ae/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hayageek.com
// @grant        unsafeWindow
// @updateURL   https://raw.githubusercontent.com/abdokhaire/eclaimlink.ae-Script/main/eclaimlink.meta.js
// @downloadURL https://raw.githubusercontent.com/abdokhaire/eclaimlink.ae-Script/main/eclaimlink.user.js
// @supportURL  https://github.com/abdokhaire/eclaimlink.ae-Script/issues
// @author      Ahmed Abdo

// ==/UserScript==


(function() {
    'use strict';

    var $ = unsafeWindow.jQuery;

    function showAllInfo(){
        let tableUpdates = $("#dataList").dataTable();
        tableUpdates.fnSettings()._iDisplayLength = 50000;
        tableUpdates.off('draw.dt');
        tableUpdates._fnReDraw();
        if($('#exportData')){
            $('#exportData').off('click');
            $('#exportData').remove();
        }
        $('#showAllInfo').html('Please Wait we are preparing the data...');

        tableUpdates.on( 'draw.dt', function (e, settings) {

            let tIds =[];
            settings.aoData.forEach((row) => {
                tIds.push(row._aData.DT_RowId);
            });

            let promises = preparePromises(tIds);

            callAllPromises(promises);
            let tableUpdates = $("#dataList").dataTable();
            tableUpdates.off('draw.dt');
        });
    }

    function preparePromises(tIds){
        console.log("Prepare Promises");
        let promises = [];
        tIds.forEach((id) => {
            promises.push(getTransInfo(id));
        });
        return promises;
    }

    function callAllPromises(promises){
        console.log("Call All Promises");
        Promise.allSettled(promises)
            .then((results) => {
            // results is an array of objects
            //console.log(results);
            $('#showAllInfo').html('Show All');
            if($('#exportData')){
                $('#exportData').off('click');
                $('#exportData').remove();
            }
            var exportButton = '<button class="button" id="exportData" style="width: 150px; height: auto;margin:5px;" type="button">Export CSV</button>';
            $('#Filter').parent().append(exportButton);

            $('#exportData').on('click', function (e, settings) {
                console.log('Export Clicked');
                prepareResultCSV(results);
            });

            // [
            //   { status: "fulfilled", value: 1 },
            //   { status: "rejected", reason: "error" },
            //   { status: "fulfilled", value: 2 },
            // ]
        })
            .catch((error) => {
            // This catch block will not be executed
            console.error(error);
        });
    }

    function getTransInfo(tId){
        return new Promise((resolve, reject) => {
            let reqData = `sEcho=1&iColumns=13&sColumns=&iDisplayStart=0&iDisplayLength=50&mDataProp_0=0&mDataProp_1=1&mDataProp_2=2&mDataProp_3=3&mDataProp_4=4&mDataProp_5=5&mDataProp_6=6&mDataProp_7=7&mDataProp_8=8&mDataProp_9=9&mDataProp_10=10&mDataProp_11=11&mDataProp_12=12&sSearch=&bRegex=false&sSearch_0=&bRegex_0=false&bSearchable_0=true&sSearch_1=&bRegex_1=false&bSearchable_1=true&sSearch_2=&bRegex_2=false&bSearchable_2=true&sSearch_3=&bRegex_3=false&bSearchable_3=true&sSearch_4=&bRegex_4=false&bSearchable_4=true&sSearch_5=&bRegex_5=false&bSearchable_5=true&sSearch_6=&bRegex_6=false&bSearchable_6=true&sSearch_7=&bRegex_7=false&bSearchable_7=true&sSearch_8=&bRegex_8=false&bSearchable_8=true&sSearch_9=&bRegex_9=false&bSearchable_9=true&sSearch_10=&bRegex_10=false&bSearchable_10=true&sSearch_11=&bRegex_11=false&bSearchable_11=true&sSearch_12=&bRegex_12=false&bSearchable_12=true&List=Details&`;
            reqData += 'TransactionId=' + tId;
            $.ajax({
                url: 'https://apps.eclaimlink.ae/Services/DataList.ashx',
                type: 'GET',
                data: reqData,
                timeout: 0,
                tryCount : 0,
                retryLimit : 2,
                success: function (data) {
                    data.tid = tId;
                    data.net = 0;
                    data.share = 0;
                    data.aaData.forEach((row) => {
                        data.net += row['4'] * 1;
                        data.share += row['5'] * 1;
                    });
                    resolve(data);
                },
                error: function (error) {
                    error.tid = tId;
                    if (this.tryCount <= this.retryLimit) {
                        $.ajax(this);
                        this.tryCount++;
                        return;
                    }
                    reject(error);
                },
            })
        });
    }

    //
    // @param {*} headers
    // @param {*} rows
    // @param {*} name
    //
    // @description
    // headers = {h1: 'Header 1', h2: 'Header 2' , h3:'Header 3'};
    // rows = [{h1:'testvalue1',h2:'testvalue2',h3:'testvalue3'},{h1:'testvalue11',h2:'testvalue22',h3:'testvalue33'}];
    // name = 'Excel File Name';
    //
    function downloadCSVFile(headers, rows,name) {
        console.log('Download CSV File');
        let hColumns = Object.keys(headers);
        const csvContent = [
            headers ,
            ...rows,
        ]
        .map((row) => {
            let filterdRow = Object.entries(row).filter(([key]) => hColumns.includes(key));
            let orderedRow = [];
            hColumns.forEach(r=> {
                orderedRow.push(filterdRow.filter(([key]) => r == key)[0]);
            });
            let newrow = Object.fromEntries(orderedRow);
            return Object.values(newrow).join(",");
        }) // convert to CSV record
        .join("\n"); // and join all records together
        //console.log(csvContent);
        var fileName = `Export ${name}.csv`.replaceAll(" ", "_");
        var uri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
        //navigator = navigator.bind(this);
        //document = document.bind(this);
        if (navigator.msSaveBlob) {
            // IE 10+
            var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            navigator.msSaveBlob(blob, fileName);
        } else {
            var link = document.createElement("a");
            link.setAttribute("download", fileName);
            link.href = uri;
            link.style = "visibility:hidden";
            link.click();
        }
    }

    function prepareCSV(){
        console.log("Prepare CSV");
        let tableUpdates = $("#dataList").dataTable();

        let tableHeaders = tableUpdates.fnSettings().aoColumns;
        let headers={};

        tableHeaders.forEach((element) => {
            headers[element.mData] = element.sTitle;
        });
        console.log(headers);

        let tableData = tableUpdates.fnSettings().aoData;
        let rows=[];
        tableData.forEach((element) => {
            let d = {};
            let k = Object.keys(element._aData);
            k.forEach((key) => {
                d[key] = element._aData[key];
            });
            rows.push(d);
        });

        let randx = Math.floor((Math.random() * 100) + 1);
        let fileName = $('#From').val() + '-' + $('#To').val()+ '-'+randx;
        downloadCSVFile(headers,rows,fileName);

    }

    function prepareResultCSV(result){
        console.log("Prepare Result CSV");
        let tableUpdates = $("#dataList").dataTable();

        let tableHeaders = tableUpdates.fnSettings().aoColumns;
        let headers={};

        tableHeaders.forEach((element) => {
            headers[element.mData] = element.sTitle;
        });
        headers.trId = 'Transaction Id';
        headers.net = 'Amount';
        headers.share = 'Patient share';

        let tableData = tableUpdates.fnSettings().aoData;
        let rows=[];
        tableData.forEach((element) => {
            let d = {};
            let k = Object.keys(element._aData);
            k.forEach((key) => {
                d[key] = element._aData[key];
            });
            d.trId = element._aData.DT_RowId;
            let recResult = result.find((rec) => {
                if( (rec.value && rec.value.tid == d.trId) || (rec.reason && rec.reason.tid == d.trId)){
                    return true;
                }
                return false;
            });
            d.net = recResult?.value?.net;
            d.share = recResult?.value?.share;
            rows.push(d);
        });
        let randx = Math.floor((Math.random() * 100000) + 1);
        let fileName = $('#From').val() + '-' + $('#To').val()+ '-'+randx;
        downloadCSVFile(headers,rows,fileName);
    }

    $(document).ready(function()
                      {
        console.log("Ready");

        var newButton = '<button class="button" id="showAllInfo" style="width: 150px; height: auto;margin:5px;" type="button">Show All</button>';

        $('#Filter').parent().append(newButton);


        $('#showAllInfo').on('click', function (e, settings) {
            console.log('Show All Info Clicked');
            showAllInfo();
        });

    });


})();
