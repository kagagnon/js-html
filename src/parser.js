const fs = require( 'fs' );
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;
const TemplateBuffer = require('./buffer');

function Parser( Template, template_str, Data = {}, Buffer = new TemplateBuffer( Template ) ){
    this.Template = Template;
    this.template_str = template_str;
    this.Data = Data;
    this.Buffer = Buffer;

    this.current_view_path = this.Template.view_path.relative_no_ext;
    this.current_full_view_path = this.Template.view_path.full_no_ext;
}

Parser.prototype.compile = function(){
    let cached_view_path = __dirname + '/_cache/' + this.current_view_path;
    return this.parseTemplate( cached_view_path );
}

Parser.prototype.parseTemplate = function( cached_view_path ){
    let compiled_js_string = '',
        current_char_pos = 0,
        next_char_pos = 0;

    compiled_js_string += this.getJsStart();

    while( ( next_char_pos = this.template_str.indexOf( '{{', current_char_pos ) ) > -1 ){
        compiled_js_string += "Buffer.push( \"" + this.escapeQuotes( this.template_str.slice( current_char_pos, next_char_pos ) ) + "\" );\n";

        let to_watch = this.template_str.slice( next_char_pos )
            ignore_next = false,
            grouping = [],
            first_bracket = false;

        for( let i = 0; i <= to_watch.length; i++  ){
            if( ignore_next ) continue;

            if( grouping.length == 0 ){
                if( to_watch[ i ] == "}" ){
                    if( !first_bracket ){
                        first_bracket = true;
                        continue;
                    }else{
                        compiled_js_string += this.parseLogic( this.template_str.slice( next_char_pos + 2, next_char_pos + i - 1 ) );
                        next_char_pos += i + 1;
                        break;
                    }
                }
            }
            first_bracket = false;

            if( to_watch[ i ] == "\\" ){
                ignore_next = true;
                continue;
            }

            if( to_watch[ i ].match( /["'`]/ ) ){
                if( grouping.length && grouping[ grouping.length - 1 ] == to_watch[ i ] ){
                    grouping.pop();
                    continue;
                }

                grouping.push( to_watch[ i ] );
                continue;
            }
        }

        current_char_pos = next_char_pos;
    }

    if( current_char_pos < this.template_str.length ){
        compiled_js_string += "Buffer.push( \"" + this.escapeQuotes( this.template_str.slice( current_char_pos ) ) + "\" );\n";
    }

    compiled_js_string += this.getJsEnd();


    this.writeFile( cached_view_path + ".js", compiled_js_string );

    delete require.cache[ require.resolve( cached_view_path ) ];
    let cached_template = require( cached_view_path );

    return cached_template( this.Template, this.Buffer, this.Data );
}

Parser.prototype.parseLogic = function writeFile( logic_string ) {
    logic_string = logic_string.trim();

    let a_logic = logic_string.split( ':' ),
        logic_key = a_logic.shift(),
        logic_object = this.Template.options.logic[ logic_key.trim() ];

    if( logic_object && typeof logic_object.parser == 'function' ){
        let logic_arguments = a_logic.join( ':' ).replace( /\n/g, ' ' );

        return logic_object.parser( logic_string, logic_arguments );
    }else{
        let rebuilded_logic_string = [ logic_key ].concat( a_logic ).join( ':' );
        return this.Template.options.logic[ 'default' ].parser( rebuilded_logic_string, rebuilded_logic_string );
    }
}

Parser.prototype.writeFile = function writeFile(path, contents) {
    mkdirp.sync( getDirName(path) );
    fs.writeFileSync( path, contents );
}

Parser.prototype.escapeQuotes = function( string_to_escape ){
    return string_to_escape.replace( /("|\\)/g, "\\$1" ).replace( /\n/g, "\\\n" );
}

Parser.prototype.getJsStart = function(){
    return `
    function render( Template, Buffer, Data ){
        with( Data ){
    `;
}

Parser.prototype.getJsEnd = function(){
    return `
        }
        return Buffer.echo( false, Data);
    };
    module.exports = render;
    `;
}

Parser.prototype.render = function(){
    return this.compile();
}

module.exports = Parser;
