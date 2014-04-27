var query;

var main = function(){
	query = document.getElementById("query").innerHTML.toUpperCase();
	console.log(query);
	var queryObject = ParseQuery(query);
	if (queryObject === null) return null;
	
	for (var x in queryObject){
		console.log(x + ": " + queryObject[x]);
	}
	var resultsObject = QueryData(queryObject);
	if (resultsObject === null) return null;
	//PopulateTable(result_array);
}

var ParseQuery = function(query){	
	//Seperate the query into clauses
	var select_index = query.indexOf("SELECT");
	var from_index = query.indexOf("FROM");
	var where_index = query.indexOf("WHERE");
	var select_clause, from_clause, where_clause;
	if (select_index >= 0 && from_index >= 0){
		select_clause = query.slice(select_index, from_index).trim();
		if (where_index >= 0){
			from_clause = query.slice(from_index, where_index).trim();
			where_clause = query.slice(where_index).trim();
			if (where_clause[where_clause.length-1] === ";"){
				where_clause = where_clause.slice(0, where_clause.length-1);
			}
		}else{
			from_clause = query.slice(from_index).trim();
		}
	}
	else{
		var error = "Query not properly formed.<br/><i>Doesn't contain SELECT or FROM clause</i>";
		document.getElementById("result_table").innerHTML = error;
		return null;
	}
	
	//Parse individual clauses for relevant information
	//Columns to project (FROM THE SELECT CLAUSE)
	var column_array = select_clause.slice(6).trim().split(",");
	if (column_array[0].trim() === ""){
		var error = "Query not properly formed.<br/><i>No columns specified in SELECT clause</i>";
		document.getElementById("result_table").innerHTML = error;
		return null;
	}
	
	//files to load from (FROM THE FROM CLAUSE)
	var load_a = (from_clause.indexOf(" A") > 0 || from_clause.indexOf(",A") > 0);
	var load_b = (from_clause.indexOf(" B") > 0 || from_clause.indexOf(",B") > 0);
	var load_c = (from_clause.indexOf(" C") > 0 || from_clause.indexOf(",C") > 0);
	var cond_array;
	
	//select conditions (FROM THE WHERE CLAUSE)
	if (where_clause){
		cond_array = where_clause.slice(5).trim().split(/(AND|&AMP;&AMP;)/);
		//I don't know why the above keeps the "AND"s/"&&"s as elems in resulting array
		for (var i = cond_array.length-1; i >= 0; i--){
			if (cond_array[i].trim() === "AND" || cond_array[i].trim() === "&AMP;&AMP;")
				cond_array.splice(i, 1);
		}
	}
	if (cond_array[0].trim() === ""){
		var error = "Query not properly formed.<br/><i>Empty WHERE clause.</i>";
		document.getElementById("result_table").innerHTML = error;
		return null;
	}

	return {
		column_array: column_array,
		load_a: load_a,
		load_b: load_b,
		load_c: load_c,
		cond_array: cond_array
	};
}

var QueryData = function(query){		
	raw_data = LoadFiles(query);
	selected_data = SelectData(query, raw_data);
	if (selected_data === null){
		var error = "Query not properly formed.<br/><i>Invalid column in WHERE clause.</i>";
		document.getElementById("result_table").innerHTML = error;
		return null;
	}
	//Now, project selected columns (get rid of the rest...)
	
};

var LoadFiles = function(query){
	var a_data, b_data, c_data;
	
	//Figure out which files to load from, and then load them
	//This loads data every time we query the database
	//Maybe not the best!...
	if (query.load_a){
		a_text = readTextFile("A.txt").split(/\n/);
		a_data = [];
		for (var i = 0; i < a_text.length; i++){
			var a_row = a_text[i].split(/\t/);
			a_data.push({'A1': a_row[0], 'A2': a_row[1]});
		}
	}
	if (query.load_b){
		b_text = readTextFile("B.txt").split(/[ \n]+/);
		b_data = [];
		for (var i = 0; i < b_text.length; i++){
			var b_row = b_text[i].split(/\t/);
			b_data.push({'B1': b_row[0], 'B2': b_row[1], 'B3': b_row[2]});
		}
	}
	if (query.load_c){
		c_text = readTextFile("C.txt").split(/[ \n]+/);;
		c_data = [];
		for (var i = 0; i < c_text.length; i++){
			var c_row = c_text[i].split(/\t/);
			c_data.push({
				'C1': c_row[0], 'C2': c_row[1], 'C3': c_row[2], 'C4': c_row[3]
			});
		}
	}
	return {'A': a_data, 'B': b_data, 'C': c_data};
};

var SelectData = function(query, raw_data){
	//Now, apply the conditions (If there are any)
	if (query.cond_array){
		for (var i = 0; i < query.cond_array.length; i++){
			var refined_data = {};
			var elems = query.cond_array[i].split("=");
			elems[0] = elems[0].trim();
			elems[1] = elems[1].trim();
			var table1 = SearchForTable(raw_data, elems[0]);
			var table2 = SearchForTable(raw_data, elems[1]);
			if (table1 === null || table2 === null){
				return null;
			}
			
			if (table1.name !== table2.name){
				new_table = table1.name + table2.name
				refined_data[new_table] = [];
				for (var j = 0; j < table1.length; j++){
					for (var k = 0; k < table2.length; k++){
						if (table1.table[j][elems[0]] == table2.table[k][elems[1]]){
							var new_row = {};
							for (var col in table1.table[j]){ 
								new_row[col] = table1.table[j][col];
							}
							for (var col in table2.table[k]){
								new_row[col] = table2.table[k][col];
							}
							
							refined_data[new_table].push(new_row);
						}
					}
				}
				delete raw_data[table1.name];
				delete raw_data[table2.name];
			}
			else{
				new_table = table1.name;
				refined_data[new_table] = [];
				for (var j = 0; j < table1.table.length; j++){
					if (table1.table[j][elems[0]] == table1.table[j][elems[1]]){
						refined_data[new_table].push(table1.table[j]);
					}
				}
				delete raw_data[table1.name];
			}
			
			//add all defined tables that haven't already been added or joined
			for (var table in raw_data){
				var found_table = false;
				if (raw_data[table]){
					refined_data[table] = raw_data[table];
					delete raw_data[table];
				}
			}
			
			raw_data = refined_data;
			for (var table in refined_data){
				alert(table);
			}
			alert("ON TO THE NEXT LOOP :)");
		}
	}
	
	return raw_data; //Not really raw anymore...
}

var SearchForTable = function(data, col_name){
	var all_cols = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3", "C4"];
	var found_col = false;
	for (var i = 0; i < all_cols.length; i++){
		if (all_cols[i] == col_name){
			found_col = true;
			break;
		}
	}
	if (!found_col){ 
		return null;
	}
	
	//Loop through all currently existing tables
	for (var table in data){
		if (data[table]){
			for (var col in data[table][0]){
				if (col_name === col){
					return {name: table, table: data[table]};
				}
			}
		}
	}
	return null;
};

var PopulateTable = function(result_data){
	return false;
};