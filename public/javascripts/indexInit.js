/**
 * This is the initializing script for the index page
 *
 * Created by mgao on 2/15/15.
 */

var REPO_JSON;
var FINALFILEDATA_JSON;
var userid;
/*Bool variable for controlling the 3D repo rendering*/
var to_start = false;
if (is_dataready == 1) {//DISPLAY USER INFO

    /*HIDE UNUSED DIV*/
    $(function () {
        //$('#info_aboutpage').css("display", "none");
        //$('#info_aboutpage').hide();
    });
    /*GET USER JSON DATA READY*/
    $(function () {
        userid = $('#userid').text();//GET UID
        $.getJSON('/getjson?username=' + userid, function (result) {

            REPO_JSON = result;
            for (var i = 0; i < result.length; i++) {
                var tempreponame = result[i].name;
                var tmpi = "#" + i.toString();
                $("<li><a href='" + tmpi + "'> " + tempreponame + "</a></li>").appendTo("#repotabs");
            }

            /*NEED TO PLACE THE FUNCTION HERE,INSIDE THE CALLBACK, HOVER EVENTS*/
            $('#repotabs a').hover(function (e) {
                var file = $(this).attr("href");//GET THE HREF ATTRIBUTE
                var tabNumber = file.substr(1, file.length - 1);
                var index = parseInt(tabNumber);//GET THE INDEX OF THE REPO LIST
                $('#repoTabContent').html(function () {
                    var repo_name = REPO_JSON[index].name;
                    var repo_owner = REPO_JSON[index].owner;
                    var repo_lastupdata = REPO_JSON[index].last_updated;
                    var repo_isprivate = REPO_JSON[index].is_private;
                    var repo_description = REPO_JSON[index].description;
                    return "<ul class='repoinfo_list'><li class='repoinfo_text'>Repository Name: " + repo_name + "</li>" +
                        "<li class='repoinfo_text'>Owner: " + repo_owner + "</li>" +
                        "<li class='repoinfo_text'>Last Updated: " + repo_lastupdata + "</li>" +
                        "<li class='repoinfo_text'>Is Private: " + repo_isprivate + "</li>" +
                        "<li class='repoinfo_text'>Description: " + repo_description + "</li>" +
                        "</ul>";

                });


                /*KEEP THE LAST HOVERED TAB HIGHLIGHT*/
                $("#repotabs a").css("backgroundColor", "#333").css("color", "#ccc");
                $(this).css("backgroundColor", "#2580a2").css("color", "white");

//                    $(this).siblings().removeClass('');
//                    $(this).addClass('selected');
//                    return false;
//                    a.preventDefault();

            });//END HOVER EVENT


            /*REPO TABS CLICK EVENTS*/
            $('#repotabs a').click(function (e) {
                var file = $(this).attr("href");
                var tabNumber = file.substr(1, file.length - 1);
                var index = parseInt(tabNumber);//GET THE INDEX OF THE REPO LIST
                //console.log(index);
                var repo_slug = REPO_JSON[index].slug;
                var repo_name=REPO_JSON[index].name;
                var repo_owner=REPO_JSON[index].owner;
                //console.log('owner:'+repo_owner);

                $.post("/reposlug",{repo_slug:repo_slug,repo_name:repo_name,repo_owner:repo_owner}).done(function(data){

                    //console.log(data);
                    /*GET THE RETRIVED DATA*/
                    FINALFILEDATA_JSON=data;
                    //console.log("HEREEEEEEE");
                    //console.log(FINALFILEDATA_JSON);

                    /*AJAX REQUEST TO GET THE SCRIPT*/
                    var htmlobj= $.ajax({
                        type: "GET",
                        url: "/script",
                        dataType: "script"
                    });

                    $("#viewscene").html(htmlobj);//INSERT THE SCRIPT

                    /*CLOSE THE GUIDE TEXT DIV*/
                    $('#viewscene_guide').css("display", "none");
                });


            });//END CLICK EVENT


            /*SET DEFAULT DISPLAY REPO THE FIRST REPO IN THE REPO LIST*/
            $("#repotabs a:first ").css("backgroundColor", "#2580a2").css("color", "white");
            $('#repoTabContent').html(function () {
                var repo_name = REPO_JSON[0].name;
                var repo_owner = REPO_JSON[0].owner;
                var repo_lastupdata = REPO_JSON[0].last_updated;
                var repo_isprivate = REPO_JSON[0].is_private;
                var repo_description = REPO_JSON[0].description;
                return "<ul class='repoinfo_list'><li class='repoinfo_text'>Repository Name: " + repo_name + "</li>" +
                    "<li class='repoinfo_text'>Owner: " + repo_owner + "</li>" +
                    "<li class='repoinfo_text'>Last Updated: " + repo_lastupdata + "</li>" +
                    "<li class='repoinfo_text'>Is Private: " + repo_isprivate + "</li>" +
                    "<li class='repoinfo_text'>Description: " + repo_description + "</li>" +
                    "</ul>";
            });
            /*END SET THE DEFAULT REPO DISPLAY INFO*/

        });//END GETJSON
    });

    /*FOR LOADING ANIMATION*/
    $body = $("body");
    $(document).on({
        ajaxStart: function() { $body.addClass("loading");   },
        ajaxStop: function() { $body.removeClass("loading"); }
    });

} else if (is_dataready == 2) {//DISPLAY INITIAL REPO INFO
    $(function () {
        $('#infosection_userinfo').css("display", "none");
        $('#infosection_repoinfo').css("display", "none");
        $('#info_aboutpage').css("display", "none");

    });

}
else {//DISPLAY ABOUT PAGE ELSE 3
    $(function () {
        $('#infosection_userinfo').css("display", "none");
        $('#infosection_repoinfo').css("display", "none");
        $('#info_initial').css("display", "none");
        $('#info_aboutpage').show();

    });
}