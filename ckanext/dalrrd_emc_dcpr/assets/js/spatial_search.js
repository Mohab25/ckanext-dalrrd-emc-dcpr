ckan.module("spatial_search", function($){
    let divisions_unit = [
        {"unit_name":"sa_national", "number_of_files":1},
        {"unit_name":"sa_provinces", "number_of_files":5},
        {"unit_name":"sa_district_municipalities", "number_of_files":26},
        {"unit_name":"sa_local_municipalities", "number_of_files":107},
    ]
    var division_caps
    var divisionCapsOb = {
        "sa_national":"National", "sa_provinces":"Provinces", "sa_district_municipalities":"District municipalities",
         "sa_local_municipalities":"Local municipalities"
    }
    var divisions_json = {}

    return{
        initialize:function(){
            let _this = this
            if(document.readyState == "complete"){_this.mapper()}
            else{window.addEventListener( "load", (e)=>setTimeout(_this.mapper(),1500))}
            $.proxyAll(this,/_on/);
        },
        mapper: function(){
            var _this = this
            let Lmap = window.map
            let getDivisionCaps = function(division){
                let _caps = division.charAt(0).toUpperCase() + division.slice(1);
                division_caps = _caps.replace("_", " ")
                return division_caps
            }
            if(Lmap == undefined){
                setTimeout(this.mapper,1500)
            }
            else{
                let divisions = ["national", "provinces", "district_municipalities", "local_municipalities"]
                let divisions_overlay = {}
                divisions.forEach(division =>{
                    division_caps = getDivisionCaps(division)
                    divisions_overlay[division_caps] = L.layerGroup()
                    let division_json = L.geoJson(null,{
                        onEachFeature:function(feature, layer){

                            /* for reasons related to browser cache
                               i put this functionality here instead
                               of in it's own function */

                            layer.on({'click':function(e){
                                let geojson_from_feature = L.geoJson(e.target.feature)
                                let bounds = geojson_from_feature.getBounds()
                                let bound_str = bounds.toBBoxString()
                                $('#ext_bbox').val(bound_str)
                                setTimeout(function() {
                                    map.fitBounds(bounds);
                                    var form = $(".search-form");
                                    form.submit();
                                  }, 200);
                                }})
                            }
                        })

                    let prefixed_json = "sa_" + division
                    divisions_json[prefixed_json] = division_json
                })

                for(let unit of divisions_unit){
                    let urls_list = []
                    let unit_name = unit["unit_name"]
                    let files_number = unit["number_of_files"]
                    for(let i=1;i<=files_number;i++){
                        url = `${location.origin}/sa_boundaries/${unit_name}/${unit_name}${i}.geojson`
                        urls_list.push(url)
                    }
                    Promise.all(urls_list.map(url=>{
                      fetch(url).then(res=> res.json()).then(data=>{
                        data.features.forEach(item=>{
                            divisions_json[unit_name].addData(item)
                        })
                    })
                    })).then(()=>{divisions_overlay[divisionCapsOb[unit_name]].addLayer(divisions_json[unit_name])})
                }

                let layerControl = L.control.layers(null,divisions_overlay)
                layerControl.addTo(Lmap);
                // adding circle to leaflet draw
                $("a.leaflet-draw-draw-rectangle").parent().append(
                    $("<a class='leaflet-draw-draw-circle'></a>")
                )

                $('a.leaflet-draw-draw-circle').hover(function(e){
                    $(this).css({"cursor":"pointer"})
                })

                $('a.leaflet-draw-draw-circle').on('click', function(e){
                    $('body').toggleClass('dataset-map-expanded');
                    let drawer = new L.Draw.Circle(Lmap)
                    drawer.enable()
                  });

                  Lmap.on('draw:created', function (e) {
                    layer = e.layer;
                    layer.addTo(Lmap);
                    $('#ext_bbox').val(layer.getBounds().toBBoxString());
                });
            }
        },

    }
})
