/***************************************************************************************************
 Part of the following code is from javascript thee.js library provided example code for rendering
 cubes on orthographic view. A lot of modifications was made based on the example code.
 cite:http://threejs.org/

 First part is for the pre processing for the tree-map algorithm provided by author on Github.
 Specific link, please refer to the project wiki page.


 ===================================================================================================
 This is the main repo model rendering script based on processing the stored Repo JSON file returned
 by API call.
 ===================================================================================================

 Created by Minyuan Gao on 1/13/15.
 ***************************************************************************************************/


/*SOME IMPORTANT GLOBAL VAR*/
var SIZE = 500;//1000*1000 square
var previousCube;
var previousCubeSelectedMesh;
var cubeObjects = [];//Global cube information container
var cubeFilteredList = [];//list for storing filtered commit cube
var previousLineCollection = [];//list for storing the pointing line
var previousLinePointCollection = [];//list for storing the line proint cube
var commitNodeMap = [];//list for storing commit message list corresponding node
var cubeCommitNodeList = [];//list for storing highlighted cube mesh from commit message list
var authorList = [];
var authorListNameMap = [];
var authorColor = [];
var isColorByAuthorMode = false;
var isSelected = false;
var JSON_FILECOOR = {
    file: []
};


/**
 * TREE MAP COORDINATE CONSTRUCT
 */
$(function () {
    var renderer = function (x, y, w, h, n) {
        var jsontmp;//temp val to holder data
        if (!n.nodes || n.nodes.length == 0) {
            if (n.level == 2) {
                if (n.parent.data == '/') {
                    jsontmp = {
                        file_isnode: false,
                        file_name: n.data,
                        file_x: x,
                        file_y: y,
                        file_width: w,
                        file_height: h,
                        file_fill: n.parent.color
                    };

                } else {
                    jsontmp = {
                        file_isnode: false,
                        file_name: n.parent.data + n.data,
                        file_x: x,
                        file_y: y,
                        file_width: w,
                        file_height: h,
                        file_fill: n.parent.color
                    };
                }
            }

        } else {
            jsontmp = {
                file_isnode: true,
                file_name: n.data,
                file_x: x,
                file_y: y,
                file_width: w,
                file_height: h,
                file_fill: 'none'
            };
        }
        JSON_FILECOOR['file'].push(jsontmp);
    };


    var regions = {};

    /*Temp json file for treemap base block computing*/
    var JSONfile_rawdata = [];
    for (var i = 0; i < FINALFILEDATA_JSON.repo_file.length; i++) {
        JSONfile_rawdata.push([FINALFILEDATA_JSON.repo_file[i].file_rawdata[0],
            FINALFILEDATA_JSON.repo_file[i].file_rawdata[1],
            FINALFILEDATA_JSON.repo_file[i].file_rawdata[2],
            FINALFILEDATA_JSON.repo_file[i].file_rawdata[3]]);
    }


//    console.log("rawfile");
//    console.log(JSONfile_rawdata);

    JSONfile_rawdata.forEach(
        function (v, i) {
            var country = v[0];
            var cia = v[1];
            var imf = v[2];
            var region = v[3];
            var w = Math.max(cia, imf);
            if (!regions[region]) {
                regions[region] = {data: region, nodes: []};
            }
            regions[region].nodes.push({weight: w, data: country});
        }
    );


    var colors = [0x00B16A, 0x674172, 0xD24D57, 0x03A678, 0xD35400, 0x95A5A6, 0xdddd00, 0x82B482, 0xFF6666, 0x999966, 0x8533D6,
        0xF1A9A0, 0xDCC6E0, 0x913D88, 0x9B59B6, 0x41837D, 0x2C3150, 0x1E8BC3, 0x5C97BF, 0x65C6BB, 0x4DAF7C];
    var world = {frame: {x: 0, y: 0, width: SIZE * 2, height: SIZE * 2}, nodes: []};
    for (var region in regions) {
        world.nodes.push(regions[region]);
    }

    for (var i in world.nodes) {
        world.nodes[i].color = colors[i % (colors.length - 1)];
    }


    /*TREEMAP ALGORITHM*/
    treemap.minFontSize = function () {
        return 10;
    };
    treemap.squarify(world, renderer);


    /*ALL DATA FINISHED*/
    //console.log('ALL DATA FINISHED:' + JSON_FILECOOR.file.length);
    init();
    animate();

});


/**
 * VALS for the model
 */
var container, stats;
var camera, scene, renderer;
var raycaster;
var projector;
var rotate = true;

/**
 * VALS for the control
 *
 */
var showControl = false;
var showControlChild = false;
var inputdays = 0;//User input days before
var materialGlobal;
var childID;


/**
 * If data is ready do the 3D render, do all the initial works
 * under the  init() function to construct the repository model.
 *
 */

function init() {

    var p = $("#viewscene");
    var position = p.position();

    //console.log("browser:"+window.navigator.appName);
    //console.log("Date:"+Date.now());

    //console.log("div x:"+position.left);
    //console.log("div y:"+position.right);

    /*CLEAN PREVIOUS DATA*/
    authorList.length = 0;
    authorColor.length = 0;


    $("div").remove(".modelcontainer");
    container = document.createElement('div');
    container.className = "modelcontainer";
    container.style.width = 100 + '%';
    document.body.appendChild(container);//add this div to the html body

    scene = new THREE.Scene();
    raycaster = new THREE.Raycaster();
    projector = new THREE.Projector();

    camera = new THREE.OrthographicCamera(window.innerWidth / -1.8, window.innerWidth / 1.8, window.innerHeight / 1.8, window.innerHeight / -1.8, -500, 1000);
    camera.position.x = 100;
    camera.position.y = 100;//affect the height of the camera
    camera.position.z = 100;

    //REPO CUBE BUILDUP
    var repocube;
    //var gap=6.5;//For special testing purpose sometimes
    var gap = 10;//Gap between each commit block,Will be tuned according to different file display amount
    var geometry;
    var cubeCounter = 0;
    for (var i = 0; i < JSON_FILECOOR.file.length; i++) {
        var tmptext = JSON_FILECOOR.file[i].file_name;
        var tmpx = JSON_FILECOOR.file[i].file_x;
        var tmpy = JSON_FILECOOR.file[i].file_y;
        var tmpw = JSON_FILECOOR.file[i].file_width;
        var tmph = JSON_FILECOOR.file[i].file_height;
        var colortmp = JSON_FILECOOR.file[i].file_fill;
        var isNode = JSON_FILECOOR.file[i].file_isnode;
        var material;

        /*GLOBAL CUBE MATERIAL*/
        material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x303030, opacity: 1, shading: THREE.FlatShading, overdraw: 0.5 });
        materialGlobal = material;
        if (!isNode) {
            //console.log('here');
            geometry = new THREE.BoxGeometry(tmpw - gap, 10, tmph - gap);
//            var coloremissive=new THREE.Color(0x303030);//Normally, the color affecting the brightness.
//            material.emissive = coloremissive;
            var color = new THREE.Color(colortmp);
            material.color = color;
            repocube = new THREE.Mesh(geometry, material);
            repocube.position.x = tmpx - SIZE + tmpw / 2;
            repocube.position.y = 0;
            repocube.position.z = tmpy - SIZE + tmph / 2;
            var baseCubeTime;
            var baseCubeAuthor;
            var baseCubeAuthorID;
            for (var m = 0; m < FINALFILEDATA_JSON.repo_file.length; m++) {
                if (tmptext == FINALFILEDATA_JSON.repo_file[m].filefullpath) {
                    baseCubeTime = FINALFILEDATA_JSON.repo_file[m].file_block_level[0].commit_time;
                    baseCubeAuthor = FINALFILEDATA_JSON.repo_file[m].file_block_level[0].raw_author;
                    baseCubeAuthorID = FINALFILEDATA_JSON.repo_file[m].file_block_level[0].author;
                    break;
                }
            }
            //console.log(baseCubeAuthorID);
            insertAuthor_HardCodeColor(baseCubeAuthorID, baseCubeAuthor);
            repocube.cube_info = {cube_index: cubeCounter,
                cube_color: colortmp,
                operation: "File Created",
                commit_time: baseCubeTime,
                raw_author: baseCubeAuthor,
                author: baseCubeAuthorID,
                file_name: tmptext,
                file_path: "/" + tmptext};
            cubeObjects.push(repocube);
            scene.add(repocube);
            cubeCounter++;

            var currentYheight = 10;
            for (var j = 0; j < FINALFILEDATA_JSON.repo_file.length; j++) {
                if (tmptext == FINALFILEDATA_JSON.repo_file[j].filefullpath) {
                    var k = 1;
                    while (k != FINALFILEDATA_JSON.repo_file[j].file_block_level.length) {

                        var repolevelcube;//cube for holding the height of each commit
                        var levelHeight;//Height for different commit amount
                        if (FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height < 50) {
                            levelHeight = 5;
                        } else if (FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height < 100 &&
                            FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height >= 50) {
                            levelHeight = 10;
                        } else if (FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height >= 100 &&
                            FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height < 400) {
                            levelHeight = 20;
                            //levelHeight=4*Math.log(FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height);
                        } else if (FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height >= 400) {
                            levelHeight = 30;
                            //levelHeight=4*Math.log(FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height);
                            //console.log("going big block");

                        }
                        else {
                            levelHeight = 10;
                        }

                        geometry = new THREE.BoxGeometry(tmpw - gap, levelHeight, tmph - gap);
                        var color = new THREE.Color(colortmp);
                        material.color = color;
                        repolevelcube = new THREE.Mesh(geometry, material);
                        repolevelcube.position.x = tmpx - SIZE + tmpw / 2;
                        repolevelcube.position.y = currentYheight + 10;
                        repolevelcube.position.z = tmpy - SIZE + tmph / 2;
                        repolevelcube.cube_info = {cube_index: cubeCounter, cube_color: color,
                            file_name: FINALFILEDATA_JSON.repo_file[j].filename,
                            file_path: "/" + FINALFILEDATA_JSON.repo_file[j].filefullpath,
                            operation: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].operation,
                            raw_author: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].raw_author,
                            author: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].author,
                            commit_time: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].commit_time,
                            add_height: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].add_height,
                            remove_height: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].remove_height,
                            commit_node: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].commit_node,
                            commit_raw_node: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].raw_node,
                            commit_message: FINALFILEDATA_JSON.repo_file[j].file_block_level[k].commit_message
                        };
                        insertAuthor_HardCodeColor(FINALFILEDATA_JSON.repo_file[j].file_block_level[k].author, FINALFILEDATA_JSON.repo_file[j].file_block_level[k].raw_author);
                        cubeObjects.push(repolevelcube);
                        scene.add(repolevelcube);
                        cubeCounter++;
                        currentYheight = currentYheight + levelHeight + 5;
                        k++;
                    }
                    break;//Do not care those not matching file
                }

            }


        }


    }


    // Lights
    var ambientLight = new THREE.AmbientLight(Math.random() * 0x10);
    scene.add(ambientLight);

    var directionalLight = new THREE.DirectionalLight(10982780);//Relatively optimal light
    directionalLight.position.normalize();
    scene.add(directionalLight);

    renderer = new THREE.CanvasRenderer();
    //renderer = new THREE.WebGLRenderer();//seems good performance, but has camera issue.
    //renderer.setClearColor(0xf0f0f0);
    renderer.setSize(window.innerWidth - 15, window.innerHeight);

    renderer.setClearColor(0x030303, 0.89);//scene background color
    container.appendChild(renderer.domElement);

    document.addEventListener('mousedown', onDocumentMouseDown, false);

    //window.addEventListener( 'resize', onWindowResize, false );
    //document.body.addEventListener('mousewheel', mousewheel, false);


    /*INFO TEXT LABEL*/
    var infotext = document.createElement('div');
    infotext.style.background = '#333';
    infotext.style.position = 'absolute';
    infotext.style.width = 100;
    infotext.style.height = 200;
    infotext.style.color = "#FFFFFF";
//    infotext.style.border="2px solid #CECECE"; //board option
    infotext.innerHTML = "<br>" + "Repository Name:   " + FINALFILEDATA_JSON.repo_name + "<br>" + "Totoal file displayed:   " + FINALFILEDATA_JSON.repo_file.length + "<br><br>";
    infotext.style.top = 200 + 'px';
    infotext.style.left = 20 + 'px';
    infotext.style.fontSize = "85%";
    infotext.alignContent = "center";
    infotext.style.paddingLeft = "20px";
    infotext.style.paddingRight = "20px";
    container.appendChild(infotext);

    //console.log("cube total:"+cubeCounter);


    /*CONTROL MENE DROPDOWN*/
    var controlMenu = document.createElement('div');
    controlMenu.style.position = "absolute";
    controlMenu.style.width = 60;
    controlMenu.style.height = 200;
    controlMenu.style.top = 265 + 'px';
    controlMenu.style.left = 15 + 'px';
    controlMenu.style.color = "#FFFFFF";
    //controlMenu.style.border="2px solid #CECECE";
    //controlMenu.style.paddingLeft="5px";
    controlMenu.style.paddingTop = "5px";
    controlMenu.style.paddingBottom = "5px";
    controlMenu.style.paddingRight = "20px";
    controlMenu.innerHTML =
        "<li onclick='showControl=!showControl;toggleControl(showControl);' class='btnControlTop'>" + "<font color=\"white\">" + "Controls" + "</font>" + "</li>" +
        "<li onclick='rotate = !rotate;' class='btnControl'>" + "<font color=\"white\">" + "Camera" + "</font>" + "</li>" +
        "<li onclick='showControlChild=!showControlChild;childID=\"filterChild\";toggleControlChild(showControlChild,childID,4);' class='btnControlParent'>" + "<font color=\"white\">" + "Filter" + "</font>" + "</li>" +
        "<li onclick='filterByDate(7);' class='btnControlChild' id=\"filterChild1\">" + "<font color=\"white\">" + "Show Last One Week" + "</font>" + "</li>" +
        "<li onclick='filterByDate(14);' class='btnControlChild' id=\"filterChild2\">" + "<font color=\"white\">" + "Show Last Two Week" + "</font>" + "</li>" +

        "<li class='btnControlChildSpecial' id=\"filterChild3\">" + " <font color=\"white\">" + "Specify Days Before" + "</font>" + "</br>" + "<input type =\"input\"  size='15' id=\"userInputDays\" onclick='this.select();' placeholder=\"Enter a Number\">" +
        "<button id=\"btnApply\" onclick='inputdays=recordDays();filterByDate(inputdays);btnTest();'>" + "Apply" + "</button>" + "</li>" +

        "<li onclick='clearFilter();' class='btnControlChild' id=\"filterChild3\">" + "<font color=\"white\">" + "Clear Filter" + "</font>" + "</li>" +
        "<li onclick='showControlChild=!showControlChild;childID=\"settingChild\";toggleControlChild(showControlChild,childID,2);' class='btnControlParent'>" + "<font color=\"white\">" + "Settings" + "</font>" + "</li>" +
        "<li onclick='colorByAuthor();' class='btnControlChild' id=\"settingChild1\">" + "<font color=\"white\">" + "Color By Author" + "</font>" + "</li>" +
        "<li onclick='resetToDefaultColor();' class='btnControlChild' id=\"settingChild2\">" + "<font color=\"white\">" + "Reset Color" + "</font>" + "</li>";

    container.appendChild(controlMenu);


    /*CLOSE CONTROL AT FIRST*/
    closeControl();


    /*MOST RECENT COMMIT MESSAGE LIST*/
    var tempstr = "【 MOST RECENT COMMIT MESSAGE 】" + "<br>" + "<hr width='320px'>";
    var listAmount = FINALFILEDATA_JSON.repo_changeset_list.length;

    if (listAmount > 0) {
        for (var k = 0; k < listAmount; k++) {
            var tempCommitMsg = FINALFILEDATA_JSON.repo_changeset_list[listAmount - k - 1].message;
            if (tempCommitMsg.length > 40) {
                tempCommitMsg = tempCommitMsg.substring(0, 38) + "..."
            }
            tempstr = tempstr + "<li class='commitMsgList' id='commitMsgList" + k + "'" + " onclick='highlightCommitsByNodeNumber(" +
                k + ")' class='btnControlCommitMessageList'>" + "<font color=\"white\">" + "&#8226&#32" + tempCommitMsg + "</font>" + "</li>";

            commitNodeMap.push(FINALFILEDATA_JSON.repo_changeset_list[listAmount - k - 1].node);//map with the list index;
        }
    } else {
        //Error
        console.log('Message Error');
    }


    var commitMessageList = document.createElement('div');
    commitMessageList.className = "CommitMessageListContainer";
    commitMessageList.style.position = "absolute";
    commitMessageList.style.width = 60;
    commitMessageList.style.height = 200;
    commitMessageList.style.bottom = 10 + 'px';
    commitMessageList.style.right = -10 + 'px';
    commitMessageList.style.color = "#FFFFFF";
    //controlMenu.style.border="2px solid #CECECE";
    //controlMenu.style.paddingLeft="5px";
    commitMessageList.style.paddingTop = "5px";
    commitMessageList.style.paddingBottom = "5px";
    commitMessageList.style.paddingRight = "20px";
    commitMessageList.innerHTML = tempstr;

    container.appendChild(commitMessageList);


    /*END COMMIT MESSAGE LIST*/


//    console.log("the lenght"+authorList.length);
//    for(var c=0;c<authorList.length;c++){
//        console.log(authorList[c]);
//
//    }
//    console.log("the lenght COLOR"+authorColor.length);


}


/*CAMERA ZOOM*/
var mousewheel = function (e) {
    var d = ((typeof e.wheelDelta != "undefined") ? (-e.wheelDelta) : e.detail);
    d = 100 * ((d > 0) ? 1 : -1);
    var cPos = camera.position;
    if (isNaN(cPos.x) || isNaN(cPos.y) || isNaN(cPos.y)) return;

    // Your zomm limitation
    // For X axe you can add anothers limits for Y / Z axes
    if (cPos.x > _YOUR_ZOOM_MIN_X_ || cPos.x < _YOUR_ZOOM_MAX_X_) {
        return;
    }

    mb = d > 0 ? 1.1 : 0.9;
    cPos.x = cPos.x * mb;
    cPos.y = cPos.y * mb;
    cPos.z = cPos.z * mb;
};


/**
 *
 * Function for mouse intersection with the cube,
 * providing detailed information on the top right.
 *
 *
 * @param event
 */

function onDocumentMouseDown(event) {

    event.preventDefault();
    var mouseVector = new THREE.Vector3();
    var dir = new THREE.Vector3();
    mouseVector.set(( (event.clientX - 8 + 15) / window.innerWidth ) * 2 - 1, -( (event.clientY - 187) / window.innerHeight ) * 2 + 1, -1);
    // z = - 1 important!,value adjusted for y is the distance the div to top//render right is 15px less x value plus 15
    mouseVector.unproject(camera);

    dir.set(0, 0, -1).transformDirection(camera.matrixWorld);
    raycaster.set(mouseVector, dir);
    var intersects = raycaster.intersectObjects(cubeObjects, false);

    if (intersects.length > 0) {
        //console.log(intersects);
        var intersection = intersects[0];
        //intersects[ 0 ].object.material.color.setHex( Math.random() * 0xffffff );

        /*FIRST TIME SELECT*/
        if (isSelected == false) {
            var cubeGeometry = intersection.object.geometry;
            var outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide, overdraw: 0.1});
            var outlineMesh = new THREE.Mesh(cubeGeometry, outlineMaterial);
            outlineMesh.position.x = intersection.object.position.x;
            outlineMesh.position.y = intersection.object.position.y;
            outlineMesh.position.z = intersection.object.position.z;
            outlineMesh.scale.multiplyScalar(1);
            scene.add(outlineMesh);
            previousCube = intersects[0];
            previousCubeSelectedMesh = outlineMesh;
            isSelected = true;


            /*REMOVE COMMIT MESSAGE CUBE SELECTION*/
            clearCubeSelection();
            $(".commitMsgList").removeClass("active");

            /**
             * ADDING LINE and POINTING MESH
             *
             *
             */

            /*Add the new line relation collection*/

            var Line_material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2
            });
            var centerCommitNode = intersection.object.cube_info.commit_node;
            for (var i = 0; i < cubeObjects.length; i++) {
                var tempNode = cubeObjects[i].cube_info.commit_node;
                if (tempNode == centerCommitNode) {
                    /*Draw line*/
                    var Line_geometry = new THREE.Geometry();
                    Line_geometry.vertices.push(new THREE.Vector3(intersection.object.position.x, intersection.object.position.y, intersection.object.position.z));
                    Line_geometry.vertices.push(new THREE.Vector3(cubeObjects[i].position.x, cubeObjects[i].position.y, cubeObjects[i].position.z));
                    var line = new THREE.Line(Line_geometry, Line_material);
                    previousLineCollection.push(line);
                    scene.add(line);
                    //console.log(cubeObjects[i]);

                    /*Draw line pointing highlight*/
                    var PointCubeGeometry = cubeObjects[i].geometry;
                    var PointOutlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide, overdraw: 0.1});
                    var PointOutlineMesh = new THREE.Mesh(PointCubeGeometry, PointOutlineMaterial);
                    PointOutlineMesh.position.x = cubeObjects[i].position.x;
                    PointOutlineMesh.position.y = cubeObjects[i].position.y;
                    PointOutlineMesh.position.z = cubeObjects[i].position.z;
                    PointOutlineMesh.scale.multiplyScalar(1);
                    previousLinePointCollection.push(PointOutlineMesh);
                    scene.add(PointOutlineMesh);


                }
            }

            //console.log(intersection.object.cube_info.file_name);

            /**
             * END ADDING
             *
             *
             */


        } else if (isSelected == true && previousCube != intersects[0]) {
            /*Remove previous outlined mesh*/
            scene.remove(previousCubeSelectedMesh);

            /*Remove previous relation lines and pointing mesh*/
            for (var i = 0; i < previousLineCollection.length; i++) {
                scene.remove(previousLineCollection[i]);
            }

            for (var i = 0; i < previousLinePointCollection.length; i++) {
                scene.remove(previousLinePointCollection[i]);

            }

            /*REMOVE COMMIT MESSAGE CUBE SELECTION*/
            clearCubeSelection();
            $(".commitMsgList").removeClass("active");


            /*Add the new outline mesh*/
            var cubeGeometry = intersection.object.geometry;
            var outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide, overdraw: 0.1});
            var outlineMesh = new THREE.Mesh(cubeGeometry, outlineMaterial);
            outlineMesh.position.x = intersection.object.position.x;
            outlineMesh.position.y = intersection.object.position.y;
            outlineMesh.position.z = intersection.object.position.z;
            outlineMesh.scale.multiplyScalar(1);
            scene.add(outlineMesh);
            previousCube = intersects[0];
            previousCubeSelectedMesh = outlineMesh;

            /*Add the new line relation collection*/
            var Line_material = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 2
            });
            var centerCommitNode = intersection.object.cube_info.commit_node;
            for (var i = 0; i < cubeObjects.length; i++) {
                var tempNode = cubeObjects[i].cube_info.commit_node;
                if (tempNode == centerCommitNode) {
                    var Line_geometry = new THREE.Geometry();
                    Line_geometry.vertices.push(new THREE.Vector3(intersection.object.position.x, intersection.object.position.y, intersection.object.position.z));
                    Line_geometry.vertices.push(new THREE.Vector3(cubeObjects[i].position.x, cubeObjects[i].position.y, cubeObjects[i].position.z));
                    var line = new THREE.Line(Line_geometry, Line_material);
                    previousLineCollection.push(line);
                    scene.add(line);

                    /*Draw line pointing highlight*/
                    var PointCubeGeometry = cubeObjects[i].geometry;
                    var PointOutlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide, overdraw: 0.1});
                    var PointOutlineMesh = new THREE.Mesh(PointCubeGeometry, PointOutlineMaterial);
                    PointOutlineMesh.position.x = cubeObjects[i].position.x;
                    PointOutlineMesh.position.y = cubeObjects[i].position.y;
                    PointOutlineMesh.position.z = cubeObjects[i].position.z;
                    PointOutlineMesh.scale.multiplyScalar(1);
                    previousLinePointCollection.push(PointOutlineMesh);
                    scene.add(PointOutlineMesh);
                }
            }


        } else {
            //console.log("Do nothing");
        }

        /*COMMIT INFO BOX*/
        //=============================================================================================
        /*Remove the old info box if exists*/


        /**
         * FORMING THE CODE CHANGE REVIEW URL FOR THE SELECTED COMMIT CUBE
         * @type {string}
         */

        var targetFilePath = (intersection.object.cube_info.file_path).substr(1, (intersection.object.cube_info.file_path).length);
        var targetURL = "https://" + "bitbucket.org/" + FINALFILEDATA_JSON.repo_callPath + "/commits/" + intersection.object.cube_info.commit_raw_node + "#chg-" + targetFilePath;


        $("div").remove(".commit_infobox");
        var commit_infotext = document.createElement('div');
        commit_infotext.className = "commit_infobox";
        commit_infotext.style.position = 'absolute';
        commit_infotext.style.width = 100;
        commit_infotext.style.height = 200;
        commit_infotext.style.background = "#303030";
        commit_infotext.style.opacity = "0.8";
        commit_infotext.style.color = "#FFFFFF";
        commit_infotext.style.fontSize = "85%";
        commit_infotext.style.paddingLeft = "15px";
//        commit_infotext.style.border = "2px solid #CECECE";//board option

        /*SOME FILE OPERATION COLOR SCHEME*/
        if (intersection.object.cube_info.operation == "removed") {
            commit_infotext.innerHTML = "<br>" + "Cube index:   " + intersection.object.cube_info.cube_index + "<button id=\"btnSeeChange\">" +
                "<a style=\'text-decoration: none\' target=\'_blank\' href=" + targetURL + ">" + "<font color=\"black\">" +
                "See Change" + "</font>" + "</a>" + "</button>" + "<br>"
                + "File Name:" + intersection.object.cube_info.file_name + "<br>"
                + "File Operation:" + "<font color='#ff5050'>" + intersection.object.cube_info.operation + "</font>" + "<br>"
                + "File Changes:" + "Added->" + intersection.object.cube_info.add_height + ",  Removed->" + intersection.object.cube_info.remove_height + "<br>"
                + "File Path:" + intersection.object.cube_info.file_path + "<br>"
                + "Author:" + intersection.object.cube_info.raw_author + "<br>"
                + "Commit Time:" + intersection.object.cube_info.commit_time + "<br>"
                + "Commit Node:" + intersection.object.cube_info.commit_node + "<br>"
                + "Commit Message:" + "<p class=\"commit_infotext\">" + intersection.object.cube_info.commit_message + "</p>" + "<br>";

        } else {
            commit_infotext.innerHTML = "<br>" + "Cube index:   " + intersection.object.cube_info.cube_index + "<button id=\"btnSeeChange\">" +
                "<a style=\'text-decoration: none\' target=\'_blank\' href=" + targetURL + ">" + "<font color=\"black\">" +
                "See Change" + "</font>" + "</a>" + "</button>" + "<br>"
                + "File Name:" + intersection.object.cube_info.file_name + "<br>"
                + "File Operation:" + intersection.object.cube_info.operation + "<br>"
                + "File Changes:" + "Added->" + intersection.object.cube_info.add_height + ",  Removed->" + intersection.object.cube_info.remove_height + "<br>"
                + "File Path:" + intersection.object.cube_info.file_path + "<br>"
                + "Author:" + intersection.object.cube_info.raw_author + "<br>"
                + "Commit Time:" + intersection.object.cube_info.commit_time + "<br>"
                + "Commit Node:" + intersection.object.cube_info.commit_node + "<br>"
                + "Commit Message:" + "<p class=\"commit_infotext\">" + intersection.object.cube_info.commit_message + "</p>" + "<br>";
        }

        commit_infotext.style.top = 200 + 'px';
        commit_infotext.style.right = 15 + 'px';


        container.appendChild(commit_infotext);

        //=============================================================================================

    }


    else {
        var infoBoxWidth = $('.commit_infobox').width();
        var infoBoxHeight = $('.commit_infobox').height();
        var commitMsgListsWidth = $('.CommitMessageListContainer').width();
        var commitMsgListsHeight = $('.CommitMessageListContainer').height();
        /*IF CURSOR LOCATED ON THE INFO BOX OR COMMIT MESSAGE SECTION*/
        if ((event.clientX > (window.innerWidth - infoBoxWidth) && event.clientY > 187 && event.clientY < (205 + infoBoxHeight)) ||
            (event.clientX > (window.innerWidth - commitMsgListsWidth) && event.clientY > (window.innerHeight - commitMsgListsHeight))) {

            /*DO NOTHING*/
//                /*DEBUG VALUE*/
//                console.log("info box:"+infoBoxWidth+ ","+infoBoxHeight);
//                console.log('-----');
//                console.log("mouse:"+event.clientX+","+ event.clientY);
//                console.log("window width" + window.innerWidth);
//                console.log("window height" + window.innerHeight);


            //console.log(isToSeeChange);


        }


        /*IF CURSOR LOCATED ON THE EMPTY SPACE, UNSELECTED*/
        else {
            /*UN-SELECT CUBE*/
            isSelected = false;
            scene.remove(previousCubeSelectedMesh);
            $("div").remove(".commit_infobox");//Remove the old info box if exists
            $(".commitMsgList").removeClass("active");

            /*Remove commit messge list highlighted cube*/
            clearCubeSelection();


            /*Remove previous relation line collection and pointing mesh if exists*/
            for (var i = 0; i < previousLineCollection.length; i++) {
                scene.remove(previousLineCollection[i]);
            }

            for (var i = 0; i < previousLinePointCollection.length; i++) {
                scene.remove(previousLinePointCollection[i]);

            }

        }

    }


}


function insertAuthor(name) {
    if (authorList.indexOf(name) == -1) {
        authorList.push(name);
        var tempcolorVal = Math.random() * 0xffffff;
        tempcolorVal = Math.floor(tempcolorVal);
        var tempHexStr = tempcolorVal.toString(16);
        while (tempHexStr.length != 6) {
            tempcolorVal = Math.random() * 0xffffff;
            tempcolorVal = Math.floor(tempcolorVal);
            tempHexStr = tempcolorVal.toString(16);
        }
        authorColor.push(tempcolorVal);
    }
}


/**
 * Function for doing work while processing insert different author
 *
 * @param authorID
 * @param authorName
 */

function insertAuthor_HardCodeColor(authorID, authorName) {
    //console.log("in fuc"+name);
    var distinctColorHex = [0x3CB371, 0xDC143C, 0x483D8B, 0xFFD700, 0x708090, 0x4169E1, 0xBC8F8F, 0x9370DB, 0xEE82EE];
    if (authorList.indexOf(authorID) == -1) {
        authorList.push(authorID);
        authorListNameMap.push(authorName);
        var authorIndex = authorList.length;
        if (authorIndex > 9) {
            var tempcolorVal = Math.random() * 0xffffff;
            tempcolorVal = Math.floor(tempcolorVal);
            var tempHexStr = tempcolorVal.toString(16);
            while (tempHexStr.length != 6) {
                tempcolorVal = Math.random() * 0xffffff;
                tempcolorVal = Math.floor(tempcolorVal);
                tempHexStr = tempcolorVal.toString(16);
            }
            authorColor.push(tempcolorVal);

        } else {
            authorColor.push(distinctColorHex[authorIndex - 1]);
        }

    }

    /*Check if needs to do id to name update*/
    else {
        var tempIndex = authorList.indexOf(authorID);
        if (authorListNameMap[tempIndex].indexOf('unknown') > -1)authorListNameMap[tempIndex] = authorName;
    }


}


/**
 * Functions for displaying the matched cubes according to the input days before
 *
 * @param daysBefore
 */


function filterByDate(daysBefore) {
    /*CLEAR THE FILTER FIRST*/
    clearFilter();

    if (daysBefore == 7) {
        $('#filterChild1').toggleClass("active");
    }

    else if (daysBefore == 14) {
        $('#filterChild2').toggleClass("active");

    }
    else {
        /*Specify days filter*/
        $('#filterChild3').toggleClass("active");

    }

    var currentTime = Date.now();
    var targetStartTime = currentTime - daysBefore * 24 * 60 * 60 * 1000;
    var commitTime;
    //console.log("time1:"+currentTime);

    for (var i = 0; i < cubeObjects.length; i++) {
        var temptime = cubeObjects[i].cube_info.commit_time;
        var tempAuthor = cubeObjects[i].cube_info.author;
        /*IF COMMIT TIME IS VALID*/

        var date = temptime.substr(0, temptime.indexOf(" "));
        date = date.replace(/-/g, " ");
        var tempindex = date.indexOf(" ");
        var dateReformat = date.substr(tempindex, date.length - 1) + " " + date.substr(0, tempindex);

        //console.log(dateReformat);
        dateReformat = dateReformat.replace(/\s/g, "/");//SPECIALLY NEED FOR SAFARI BROWSER
        commitTime = Date.parse(dateReformat);
        //console.log(commitTime);

        if (parseInt(targetStartTime) < parseInt(commitTime)) {
            // console.log("Time matched");
        }
        /*CHANGE OPACITY FOR THOSE NOT MATCH*/
        else {
            var materialTemp = new THREE.MeshLambertMaterial({ color: 0xffffff,
                opacity: 0.15,
                shading: THREE.FlatShading,
                overdraw: 0.5 });

            if (isColorByAuthorMode) {
                var colorTemp = new THREE.Color(authorColor[authorList.indexOf(tempAuthor)]);
            } else {
                var colorTemp = new THREE.Color(cubeObjects[i].cube_info.cube_color);
            }
            materialTemp.color = colorTemp;
            var coloremissive = new THREE.Color(0x303030);//Normally, the color affecting the brightness.
            materialTemp.emissive = coloremissive;
            cubeObjects[i].material = materialTemp;
            cubeFilteredList.push(i);
            //console.log(cubeObjects[i]);
        }
    }

}


/**
 * Functions for resetting model
 *
 */

function clearFilter() {
    /*Remove selected effects*/
    $(".btnControlChild").removeClass("active");
    $(".btnControlChildSpecial").removeClass("active");


    if (cubeFilteredList.length != 0) {
        for (var i = 0; i < cubeFilteredList.length; i++) {
            cubeObjects[cubeFilteredList[i]].material.opacity = 1;
        }
        cubeFilteredList.length = 0;
    } else {

        //Nothing to clear;

    }

}

/**
 * Function for coloring the model according to different authors
 *
 */

function colorByAuthor() {
    /*CLEAR THE FILTER FIRST*/
    clearFilter();

    for (var i = 0; i < cubeObjects.length; i++) {
        var tempAuthorID = cubeObjects[i].cube_info.author;
        var materialTemp = new THREE.MeshLambertMaterial({ color: 0xffffff, opacity: 1, shading: THREE.FlatShading, overdraw: 0.5 });
        var colorTemp = new THREE.Color(authorColor[authorList.indexOf(tempAuthorID)]);
        materialTemp.color = colorTemp;
        //console.log(tempAuthor+Math.floor(authorColor[authorList.indexOf(tempAuthor)]).toString(16));
        var coloremissive = new THREE.Color(0x303030);//Normally, the color affecting the brightness.
        materialTemp.emissive = coloremissive;
        cubeObjects[i].material = materialTemp;
    }
    isColorByAuthorMode = !isColorByAuthorMode;


    /*Display the color to author mapping*/
    var authorColorMap = document.createElement('div');
    authorColorMap.className = "authorColor";
    authorColorMap.style.position = 'absolute';
    authorColorMap.style.width = 100;
    authorColorMap.style.height = 400;
    authorColorMap.style.margin = 10 + 'px';
    authorColorMap.style.color = "#FFFFFF";
    //authorColorMap.style.border="2px solid #CECECE";

    var tempstr = "<br>" + "<hr width='200px'>";
    if (authorList.length == authorColor.length) {
        for (var k = 0; k < authorList.length; k++) {
            var tempcolor = Math.floor(authorColor[k]);
            var hexString = "#" + tempcolor.toString(16);
            //console.log("colorstr:"+authorList[k]+hexString);
            tempstr = tempstr + "<p>" + authorListNameMap[k] + ":" + "<font color=" + hexString + ">&nbsp;\u2588</font>" + "</p>";//Use &nbsp; to add space in html
        }
    } else {
        //Error
        console.log('Color Error');
    }

    tempstr = tempstr + "<hr width='200px'>";
    authorColorMap.innerHTML = tempstr;
    authorColorMap.style.top = 600 + 'px';
    authorColorMap.style.left = 12 + 'px';
    authorColorMap.style.fontSize = "85%";
    authorColorMap.alignContent = "center";
    authorColorMap.style.paddingRight = "20px";
    container.appendChild(authorColorMap);

}


function resetToDefaultColor() {
    /*Remove selected effects*/
    $(".btnControlChild").removeClass("active");
    $("div").remove(".authorColor");

    for (var i = 0; i < cubeObjects.length; i++) {
        var materialTemp = new THREE.MeshLambertMaterial({ color: 0xffffff, opacity: 1, shading: THREE.FlatShading, overdraw: 0.5 });
        var colorTemp = new THREE.Color(cubeObjects[i].cube_info.cube_color);
        materialTemp.color = colorTemp;
        var coloremissive = new THREE.Color(0x303030);//Normally, the color affecting the brightness.
        materialTemp.emissive = coloremissive;
        cubeObjects[i].material = materialTemp;
    }

    isColorByAuthorMode = false;

}


/**
 * Function for get the commit node and highligh the cube.
 */


function highlightCommitsByNodeNumber(indexNumber) {

    var nodeNumber = commitNodeMap[indexNumber];
    var tempID = "#commitMsgList" + indexNumber;
    //console.log(tempID);
    //console.log(nodeNumber);

    $(tempID).toggleClass("active");

    for (var i = 0; i < cubeObjects.length; i++) {
        var tempNode = cubeObjects[i].cube_info.commit_node;
        if (tempNode == nodeNumber) {

            /*Draw line pointing highlight*/
            var PointCubeGeometry = cubeObjects[i].geometry;
            var PointOutlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide, overdraw: 0.1});
            var PointOutlineMesh = new THREE.Mesh(PointCubeGeometry, PointOutlineMaterial);
            PointOutlineMesh.position.x = cubeObjects[i].position.x;
            PointOutlineMesh.position.y = cubeObjects[i].position.y;
            PointOutlineMesh.position.z = cubeObjects[i].position.z;
            PointOutlineMesh.scale.multiplyScalar(1);
            cubeCommitNodeList.push(PointOutlineMesh);
            scene.add(PointOutlineMesh);


        }
    }


}


function clearCubeSelection() {

    if (cubeCommitNodeList.length > 0) {

        for (var i = 0; i < cubeCommitNodeList.length; i++) {
            scene.remove(cubeCommitNodeList[i]);
        }

    }
}


/**
 *
 * Some control toggle functions
 *
 *
 */

function closeControl() {
    $(function () {
        $(".btnControl").hide();
        $(".btnControlParent").hide();
        $(".btnControlChild").hide();
        $(".btnControlChildSpecial").hide();

    });

}


function toggleControl(showControl) {
    if (showControl) {
        $(function () {
            $(".btnControl").show(300);
            $(".btnControlParent").show(300);

        });

    }
    else {
        $(function () {
            $(".btnControl").hide(300);
            $(".btnControlParent").hide(300);
            $(".btnControlChild").hide(300);
            $(".btnControlChildSpecial").hide(300);

            showControl = false;
            showControlChild = false;
        });
    }

}

function toggleControlChild(showControlChild, id, counts) {

    if (showControlChild) {
        $(function () {
            for (var i = 0; i < counts; i++) {
                var selectStr = "#" + id + (i + 1) + "." + "btnControlChild";
                $(selectStr).show(300);
                var selectStr = "#" + id + (i + 1) + "." + "btnControlChildSpecial";
                $(selectStr).show(300);
            }

        });

    }
    else {
        $(function () {
            for (var i = 0; i < counts; i++) {
                var selectStr = "#" + id + (i + 1) + "." + "btnControlChild";
                $(selectStr).hide(300);
                var selectStr = "#" + id + (i + 1) + "." + "btnControlChildSpecial";
                $(selectStr).hide(300);
            }


        });
    }

}


/**
 * Textbox funtions
 *
 *
 */

function recordDays() {
    var userInput = document.getElementById('userInputDays').value;
    return userInput;

}


function btnTest() {
    console.log(inputdays);
}


/**
 * End Textbox functions
 */



function animate() {
    requestAnimationFrame(animate);//animation function
    render();

}


function render() {
    var timer = Date.now() * 0.0001;
    if (rotate) {
        camera.position.x = Math.cos(timer) * 200;
        camera.position.z = Math.sin(timer) * 200;//For rotation animation
    }
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}