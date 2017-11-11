function parseArgsString( args_string, addition_arg_flag = '' ){
    if( !args_string.trim() ) return [];

    if( addition_arg_flag.trim() ){
        addition_arg_flag = addition_arg_flag.replace( /^\s*(.+)\s*$/, " $1 " );
    }

    let args = [],
        last_arg_cut = 0,
        current_groups = [],
        group_start_chars = "\"'`[{(",
        group_end_chars =   "\"'`]})",
        string_char_index = 2,
        is_string_group = false;

    for( let i = 0; i < args_string.length; i++ ){
        if( args_string[ i ] == '\\' ){
            i++;
            continue;
        }

        if( is_string_group ){
            if( current_groups[ current_groups.length - 1 ] == args_string[ i ] ){
                current_groups.pop();
                is_string_group = false;
            }
        }else{
            let current_char_group_index = group_start_chars.indexOf( args_string[ i ] );
            if( current_char_group_index > -1 ){
                current_groups.push( args_string[ i ] );
                if( current_char_group_index <= string_char_index ){
                    is_string_group = true;
                }
                continue;
            }

            if( current_groups.length  ){
                let current_group_index = group_start_chars.indexOf( current_groups[ current_groups.length - 1 ] );

                if( args_string[ i ] == group_end_chars[ current_group_index ] ){
                    current_groups.pop();
                }
            }else{
                if( args_string[ i ] == ',' ){
                    args.push( args_string.slice( last_arg_cut, i ) );
                    last_arg_cut = i + 1;
                    continue;
                }

                if( addition_arg_flag && args_string.substr( i, addition_arg_flag.length ) == addition_arg_flag ){
                    args.push( args_string.slice( last_arg_cut, i ) );
                    last_arg_cut = i + addition_arg_flag.length;
                    i += addition_arg_flag.length - 1;
                    continue;
                }
            }
        }

        if( i == args_string.length - 1 ){
            args.push( args_string.slice( last_arg_cut, i + 1 ) );
            continue;
        }
    }

    return args;
}


module.exports = {
    "extends" : {
        parser : function( full, args_string ){
            let args = parseArgsString( args_string );
            let view = args[ 0 ].trim();
            let data = args[ 1 ] || "{}";
            return `Template.options.logic.extends.build( Buffer, ${ view }, ${ data } );\n`;
        },
        build : function( Buffer, partial_view, Data ){
            Buffer.setExtend( partial_view, Data );
        }
    },
    'yield' : {
        parser : function( full, args_string ){
            let args = parseArgsString( args_string );
            return `Template.options.logic.yield.build( Buffer, ${ args[ 0 ] } );\n`;
        },
        build : function( Buffer, section_name ){
            Buffer.push( Buffer.echo( section_name ) );
        }
    },
    'section' : {
        parser : function( full, args_string ){
            let args = parseArgsString( args_string );
            return `Template.options.logic.section.build( Buffer, ${ args[ 0 ] } );\n`;
        },
        build : function( Buffer, section_name ){
            Buffer.startSection( section_name );
        }
    },
    'endsection' : {
        parser : function( full ){
            return `Template.options.logic.endsection.build( Buffer );\n`;
        },
        build : function( Buffer, section_name ){
            Buffer.endSection();
        }
    },
    "foreach" : {
        parser : function( full, args_string ){
            let args = parseArgsString( args_string, 'as' );
            let index_var_name = args[ 1 ];
            let value_var_name = args[ 2 ];

            if( !value_var_name ){
                value_var_name = index_var_name;
                index_var_name = false;
            }

            let function_string = "function( " + value_var_name;
            if( index_var_name ){
                function_string += ", " + index_var_name
            }
            function_string += " ){";


            return `Template.options.logic.foreach.build( ${ args[ 0 ] }, ${ function_string } \n`;
        },
        build : function( looped_object, callback ){
            if( Array.isArray( looped_object ) ){
                for( let i = 0; i < looped_object.length; i++ ){
                    callback( looped_object[ i ], i );
                }
            }else{
                Object.keys( looped_object ).forEach( function( loop_key ){
                    callback( looped_object[ loop_key ], loop_key );
                } )
            }
        }
    },

    "endforeach" : {
        parser : function( full, args_string ){
            return `} );\n`;
        }
    },

    "if" : {
        parser : function( full, args_string ){
            return `if( ${ args_string } ){\n`;
        }
    },

    "endif" : {
        parser : function( full, args_string ){
            return `}\n`;
        }
    },

    "unless" : {
        parser : function( full, args_string ){
            return `if( ${ args_string } ){\n`;
        }
    },

    "endunless" : {
        parser : function( full, args_string ){
            return `}\n`;
        }
    },

    "include" : {
        parser : function( full, args_string ){
            return `Template.options.logic.include.build( Template, Buffer, ${ args_string } );\n`;
        },
        build : function( Template, Buffer, partial_view, Data = {} ){
            Buffer.push( Template.new( partial_view, Data ).render() );
        }
    },

    "default" : {
        parser : function( full, args_string ){
            return `Buffer.push( typeof ${ args_string } != 'undefined' ? ${ args_string } : '' );\n`;
        }
    }
}
