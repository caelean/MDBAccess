var start, end;

$.Class ("ChronoShare", { },
 {
     init: function () {
         this.files = new Name ("/ndn/ucla.edu/irl/caelean/mongo-query/simple-fetch");

         this.ndn = new NDN ();
	     this.ndn.verify = false;
     },

     run: function () {
         $("#loader").fadeIn (500);
         $("#error").addClass ("hidden");

         cmd = {};
         if (PAGE == "fileList") {
             cmd = this.info_files (PARAMS.item);
         }

         if (cmd.request && cmd.callback) {
        		console.log (cmd.request.to_uri ());
        		start = new Date().getTime();
            	this.ndn.expressInterest (cmd.request, cmd.callback);
         }
         else {
             $("#loader").fadeOut (500); // ("hidden");
             $("#content").empty ();
             if (cmd.error) {
                 $("#error").html (cmd.error);
             }
             else {
                 $("#error").html ("Unknown error with " + PAGE);
             }
             $("#error").removeClass ("hidden");
         }
     },

     info_files: function(folder) {
         request = new Name ().add (this.files);
         if (PARAMS.folder)
         {
         	var components = PARAMS.folder.split('/');
         	for(i in components)
         		request.add(components[i]);
         }
         request.add("mango");

         return { request:request, callback: new FilesClosure (this) };
     },

     get_file: function (modifiedBy, hash, segments, callback/*function (bool <- data received, data <- returned data)*/) {
         baseName = new Name (modifiedBy)
             .add ("chronoshare").add ("file")
             .add (hash);

         new FileGetter (this.ndn, baseName, segments, callback)
             .start ();
     }
 });

$.Class ("RestPipelineClosure", {}, {
    init: function (collectionName, moreName) {
	this.collectionName = collectionName;
	this.moreName = moreName;
	$("#json").empty ();

	this.collection = [];
        this.counter = 0;
    },

    upcall: function(kind, upcallInfo) {
        if (kind == Closure.UPCALL_CONTENT || kind == Closure.UPCALL_CONTENT_UNVERIFIED) { //disable content verification

            convertedData = DataUtils.toString (upcallInfo.contentObject.content);
	    if (PARAMS.debug) {
		$("#json").append ($(document.createTextNode(convertedData)));
		$("#json").removeClass ("hidden");
	    }
	    
        data = JSON.parse (convertedData);
        this.collection = data;

		$("#loader").fadeOut (500); // ("hidden");
		this.onData (this.collection, undefined);
	}
        else if (kind == Closure.UPCALL_INTEREST_TIMED_OUT) {
            $("#loader").fadeOut (500); // ("hidden");
	    this.onTimeout (upcallInfo.interest);
        }
        else {
            $("#loader").fadeOut (500); // ("hidden");
	    this.onUnknownError (upcallInfo.interest);
        }

	return Closure.RESULT_OK; // make sure we never re-express the interest
    },

    onData: function(data, more) {
    },

    onTimeout: function () {
        $("#error").html ("Interest timed out");
        $("#error").removeClass ("hidden");
    },

    onUnknownError: function () {
        $("#error").html ("Unknown error happened");
        $("#error").removeClass ("hidden");
    }
});

RestPipelineClosure ("FilesClosure", {}, {
    init: function (chronoshare) {
	this._super("files", "more");
        this.chronoshare = chronoshare;
    },

    onData: function(data, more) {
        tbody = $("<tbody />", { "id": "file-list-files" });
		end = new Date().getTime();
		var time = end - start;
        $("title").text ("MDB Web Access" + (PARAMS.item?" - "+PARAMS.item:""));

        // error handling?
        newcontent = $("<div />", { "id": "content" }).append (
	    $("<h2 />").append ($(document.createTextNode("Directory:	")), $("<green />").text (data._id), 
	    					$("<grey style=float:right />").text (time + " milliseconds")),
            $("<table />", { "class": "item-list" })
                .append ($("<thead />")
                         .append ($("<tr />")
                                  	.append ($("<th />", { "class": "filename border-left", "scope": "col" }).text ("Name"))
                                	.append ($("<th />", { "class": "version", "scope": "col" }).text ("Size"))
                                   	.append ($("<th />", { "class": "size", "scope": "col" }).text ("Accessed"))
                                   	.append ($("<th />", { "class": "modified", "scope": "col" }).text ("Modified"))
                                   	.append ($("<th />", { "class": "modified-by border-right", "scope": "col" }).text (""))))
                .append (tbody)
                .append ($("<tfoot />")
                         .append ($("<tr />")
                                  .append ($("<td />", { "colspan": "5", "class": "border-right border-left" })))));
        newcontent.hide ();
        console.log(data);
		for (i in data.constituents)
		{		
			row = $("<tr />", { "class": "with-context-menu" } );
			if (i%2) { row.addClass ("odd"); }

				row.bind('mouseenter mouseleave', function() {
					$(this).toggleClass('highlighted');
				});
				if(data._id === "/")
					row.attr ("filename", data.data[i]); //encodeURIComponent(encodeURIComponent(file.filename)));
			 	else
			 	{
					row.attr ("filename", data._id + "/" + data.data[i]); //encodeURIComponent(encodeURIComponent(file.filename)));
				}
				row.bind('click', function (e) { openHistoryForData ($(this).attr ("filename")) });
				
			var mdate = String(new Date (data.constituents[i].mtime*1000));
			mdate = mdate.slice(0, mdate.indexOf("GMT"));
			
			var adate = String(new Date (data.constituents[i].atime*1000));
			adate = adate.slice(0, adate.indexOf("GMT"));
			
			var imgpath = imgFullPath(fileExtension(data.data[i]));
 			if(data.constituents[i].type === 0)
 				imgpath = "images/folder.png"; 
 			
	
			row.append ($("<td />", { "class": "filename border-left" })
				.text (data.data[i])	
 				.prepend ($("<img />", { "src": imgpath})));
			
 			if(data.constituents[i].type !== 0)
 			{
 				size = data.constituents[i].size;
 				if(size >= 1024)
 					size = size%1024 + " Kb";
 				else
 					size += " B";
 				row.append ($("<td />", { "class": "version" }).text (size));
 			}
 			else
 				row.append ($("<td />", { "class": "version" }).text (""));

			row.append ($("<td />", { "class": "size" }).text (adate));
 			row.append ($("<td />", { "class": "modified" }).text(mdate));
			row.append ($("<td />", { "class": "modified-by border-right"}).text(''));

			tbody = tbody.append (row);
        }

        displayContent (newcontent, more, this.base_url ());

	$.contextMenu( 'destroy',  ".with-context-menu" ); // cleanup
	$.contextMenu({
	    selector: ".with-context-menu",
	    items: {
		"info": {name: "x", type: "html", html: "<b>File operations</b>"},
		"sep1": "---------",
		history: {name: "View file history",
			  icon: "quit",
			  callback: function(key, opt) {
			      openHistoryForItem (opt.$trigger.attr ("filename"));
			  }},
	    }
	});
    },

    base_url: function () {
        url = "#fileList"+
            "&user="+encodeURIComponent (encodeURIComponent (PARAMS.user)) +
            "&folder="+encodeURIComponent (encodeURIComponent (PARAMS.folder));
        if (PARAMS.item !== undefined) {
            url += "&item="+encodeURIComponent (encodeURIComponent (PARAMS.item));
        }
        return url;
    }
});

