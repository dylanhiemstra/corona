class DataTable
{
    constructor(selector)
    {
        this.table = $(selector);
    }

    row(rowID)
    {
        return this.table.find("tbody tr").eq(rowID);
    }

    rows()
    {
        return this.table.find("tbody tr");
    }

    cell(row, colID)
    {
        if (Number.isFinite(row))
            row = this.row(row);

        return $(row).find("td").eq(colID);
    }

    val(row, colID)
    {
        return this.cell(row, colID).text();
    }

    valNumeric(row, colID)
    {
        return Number(this.cell(row, colID).text());
    }

    updateCell(row, colID, value)
    {
        var colInfo = Config.columnInfo(colID);

        var $cell = this.cell(row, colID);
        $cell.text(value);
        $cell.updateSortVal(value);
        var val = parseFloat(value);

        if ($cell[0] != undefined && colInfo != undefined && colInfo.low != null && colInfo.medium != null && colInfo.high != null)
            $cell[0].className = val < colInfo.low ? 'zero' : (val < colInfo.medium ? 'low' : (val < colInfo.high ? 'medium' : 'high'));
    }

    formatToolTip(row)
    {
        var fmt = function (label, curr, last) 
        {
            var changeAbs = Math.absoluteChange(last, curr);
            var change    = Math.percentageChange(last, curr);
            var daysUntilDoubled = Math.doublingInXDays(last, curr);
            changeAbs = last.format() + ((parseFloat(changeAbs) >= 0) ? '+' : '') + changeAbs.format()  + " = " + curr.format();

            return "<b>" + label + "</b>: " + changeAbs.replace(/([\-\+\=])/g, ' $1 ') + " (" + (parseFloat(change) > 0 ? '+' : '') + change.toPercent(undefined, 2) + (Number.isFinite(daysUntilDoubled) ? ", doubles in approx. "+daysUntilDoubled.toFixed(2)+" days" : '') + ")";
        };

        var country      = this.cell(row, 0).text();
        
        var population   = Number(this.cell(row, 1).text());
        
        var infCurr      = Number(this.cell(row, 2).text());
        var infLast      = Number(this.cell(row, 3).text());

        var fatCurr      = Number(this.cell(row, 5).text());
        var fatLast      = Number(this.cell(row, 6).text());

        var infStats = Math.entirePopulationAffectedInXDays(population, infLast, infCurr).round(0);

        var data = CoronaTracker.data[Config.alias(country.replace(/(.*)\s+\[.*?\]/g, '$1'))];
        var dataConfirmed = [];
        var dataDeaths = [];
        if (data != undefined)
        {
            dataConfirmed = data.confirmed.total;
            dataDeaths = data.deaths.total;
        }

        var pathConfirmed = '';
        var pathDeaths = '';
        var scale = Math.ceil(Config.graphWidth / (dataConfirmed.length-1));
        var scaleH = 1 / dataConfirmed.last(1);
        var grid = "";
        var firstInfection = 0;
        var firstDeath = 0;
        var svgH = Config.graphHeight;
        var verticalLine = function(x, color) 
        {
            return '<polyline points="' + x +',0 ' + x + ',' + (svgH + 2) + '" style="stroke:' + color + '; stroke-width:1; fill:none"/>';
        };
        var dataLine = function(points, color) 
        {
            return '<polyline points="' + points + '" style="stroke:' + color + '; stroke-width:2; fill:none"/>';
        };

        for (var i = 0; i < dataConfirmed.length; i++)
        {
            grid += verticalLine(i*scale, Config.graphColorGrid);
            pathConfirmed += (i*scale) +',' + (svgH - (parseFloat(dataConfirmed[i]) * scaleH) * svgH + 1).round() + " ";
            pathDeaths += (i*scale) +',' + (svgH - (parseFloat(dataDeaths[i]) * scaleH) * svgH + 1).round() + " ";
            if (dataConfirmed[i] <= 0) firstInfection++;
            if (dataDeaths[i] <= 0) firstDeath++;
        }
        firstInfection--;
        firstDeath--;
        
        grid += verticalLine(firstInfection*scale, Config.graphColorConfirmed);
        grid += verticalLine(firstDeath*scale, Config.graphColorDeaths);

        var tooltipText = "<b>" + country + "</b><br><br>"+
                          "<b>Population</b>: "+population.format()+" ("+(infCurr / population).toPercent()+" infected, "+(fatCurr / population).toPercent()+" died)<br>"+
                          fmt('Confirmed', infCurr, infLast) + "<br>" + 
                          fmt('Deaths', fatCurr, fatLast) + "<br>" + 
                          (infStats > 0 && Number.isFinite(infStats) ? "<br>At the current rate the entire population would be infected in approx. " + infStats + " days.<br>" : '') + "<br>"+
                          "<svg width=\""+((dataConfirmed.length-1)*scale)+"\" height=\""+(svgH+2)+"\" style=\"border: 2px solid " + Config.graphColorGrid + "\">" + 
                            grid + 
                            dataLine(pathDeaths, Config.graphColorDeaths) + 
                            dataLine(pathConfirmed, Config.graphColorConfirmed) + 
                            "</svg><br><br>" + 
                            "First infection was registered " + (dataConfirmed.length - firstInfection) + " days ago.<br>" + 
                            "First death was registered " + (dataConfirmed.length - firstDeath) + " days ago.<br><br>";

        $(row).attr('data-tooltip', tooltipText);
    }

    updateRow(row)
    {
        if (Number.isFinite(row))
            row = this.row(row);

        var cols = Config.columns();

        for (var i = 0; i < cols.length; i++)
        {
            if (cols[i].onUpdate != null)
                this.updateCell(row, i,  cols[i].onUpdate(this, row));
            else
                this.updateCell(row, i,  this.cell(row, i).text());
        }
        
        this.formatToolTip(row);
    }

    updateData(row, population, infections, infectionsLast, fatalities, fatalitiesLast)
    {
        this.updateCell(row, 1, population);
        this.updateCell(row, 2, infections);
        this.updateCell(row, 3, infectionsLast);
        this.updateCell(row, 5, fatalities);
        this.updateCell(row, 6, fatalitiesLast);
        this.updateRow(row);
    }

    getSortInfo()
    {
        var asc = this.table.find("thead th.sorting-asc").index();
        var desc = this.table.find("thead th.sorting-desc").index();

        return { 
            "index":        asc == desc ? 8 : Math.max(asc, desc),  
            "direction":    desc >= asc ? 'desc' : 'asc'
        };
    }

    sort(index, direction)
    {
        this.table.find("thead th").eq(index).stupidsort(direction);
    }

    initStupidTable()
    {
        this.table.stupidtable_settings(
            { 
                "will_manually_build_table": true 
            }
        );
        this.table.bind(
            'aftertablesort', 
            function (event, data) 
            { 
                CoronaTracker.updateSort(true); 
            }
        );
        this.table.stupidtable_build(); 
    }
}
