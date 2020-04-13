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

    predictDaysUntil(max, curr, last, scale)
    {
        max = parseFloat(max);
        curr = parseFloat(curr);
        last = parseFloat(last);

        if (curr == 0 || last == 0 || curr == last)
            return -1;

        var predictions = [ last, curr ].predictUntil(0, max * scale, 365);
        
        return {
            "days": predictions.days,
            "ratio": Math.max(0, predictions.prediction / max)
        };
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
        
        var population  = this.cell(row, 1).text();
        var infCurr     = this.cell(row, 2).text();
        var infLast     = this.cell(row, 3).text();
        var fatCurr     = this.cell(row, 8).text();
        var fatLast     = this.cell(row, 9).text();

        var infStats = this.predictDaysUntil(population, infCurr, infLast, 0.95);
        var deaStats = this.predictDaysUntil(population, fatCurr, fatLast, 0.95);

        var tooltipText = "Currently " + (infCurr / population).toPercent() + " of the population are infected.";
        if (infStats.days > 0) tooltipText += "<br>If the trend continues unchanged " + infStats.ratio.toPercent(100, 0) + " of the population will be infected in " + infStats.days + " days."
        if (deaStats.days > 0) tooltipText += "<br>If the trend continues unchanged " + deaStats.ratio.toPercent(100, 0) + " of the population will be dead in " + deaStats.days + " days."

        $(row).attr('data-tooltip', tooltipText);
    }

    updateData(row, population, infections, infectionsLast, recovered, recoveredLast, fatalities, fatalitiesLast)
    {
        this.updateCell(row, 1, population);
        this.updateCell(row, 2, infections);
        this.updateCell(row, 3, infectionsLast);
        this.updateCell(row, 5, recovered);
        this.updateCell(row, 6, recoveredLast);
        this.updateCell(row, 8, fatalities);
        this.updateCell(row, 9, fatalitiesLast);
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
